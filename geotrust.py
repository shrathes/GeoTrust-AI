"""
GeoTrust AI - Trading Address Verification (FT-01)
Runs fully offline: no API keys, no external services. Standard library only.

Pipeline:  signals -> per-signal scores -> weighted fusion
           -> contradiction detection -> explainable confidence/risk score

NOTE: Output is a decision-support indicator, NOT a real compliance decision.
"""
import math
import statistics
from dataclasses import dataclass, field


# ----------------------------------------------------------------------
# 1. DATA MODEL (synthetic / organizer-provided signals)
# ----------------------------------------------------------------------
@dataclass
class Business:
    name: str
    claimed_lat: float
    claimed_lon: float
    claims_storefront: bool = True          # business says customers visit
    # registry-like signals
    registry_lat: float | None = None
    registry_lon: float | None = None
    registered_months_ago: int | None = None
    address_type: str = "unknown"           # commercial|mixed|coworking|residential|virtual|unknown
    other_businesses_at_address: int = 0    # how many other entities share this address
    # activity-like signals (check-ins, listings, deliveries) as (lat, lon)
    activity_points: list = field(default_factory=list)
    # transaction-like signals as (lat, lon); monthly volume in currency units
    transaction_points: list = field(default_factory=list)
    monthly_txn_volume: float = 0.0


# ----------------------------------------------------------------------
# 2. GEOSPATIAL HELPERS
# ----------------------------------------------------------------------
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def centroid(points):
    return (statistics.mean(p[0] for p in points),
            statistics.mean(p[1] for p in points))


def frac_within(points, lat, lon, radius_km):
    if not points:
        return None
    return sum(haversine_km(lat, lon, p[0], p[1]) <= radius_km for p in points) / len(points)


# ----------------------------------------------------------------------
# 3. SIGNAL SCORERS  (each returns (score 0..1 or None, explanation))
# ----------------------------------------------------------------------
def s_registry_match(b: Business):
    if b.registry_lat is None:
        return None, "No registry location available"
    d = haversine_km(b.claimed_lat, b.claimed_lon, b.registry_lat, b.registry_lon)
    score = math.exp(-d / 0.5)  # 0 km ->1.0, 0.5 km ->0.37, 2 km ->0.02
    return score, f"Claimed vs registry address are {d*1000:.0f} m apart"


def s_activity_geo(b: Business):
    f = frac_within(b.activity_points, b.claimed_lat, b.claimed_lon, 0.15)
    if f is None:
        return None, "No activity signals available"
    return f, f"{f*100:.0f}% of {len(b.activity_points)} activity points fall within 150 m of claimed address"


def s_transaction_geo(b: Business):
    f = frac_within(b.transaction_points, b.claimed_lat, b.claimed_lon, 0.3)
    if f is None:
        return None, "No transaction signals available"
    return f, f"{f*100:.0f}% of {len(b.transaction_points)} transactions occur within 300 m of claimed address"


ADDRESS_TYPE_PRIOR = {"commercial": 1.0, "mixed": 0.75, "coworking": 0.55,
                      "residential": 0.45, "virtual": 0.15, "unknown": 0.5}


def s_address_type(b: Business):
    base = ADDRESS_TYPE_PRIOR.get(b.address_type, 0.5)
    n = b.other_businesses_at_address
    crowd = 1.0 / (1.0 + max(0, n - 3) / 8.0)  # >3 co-tenants starts hurting
    return base * (0.6 + 0.4 * crowd), (
        f"Address type '{b.address_type}' with {n} other businesses registered there")


def s_age(b: Business):
    if b.registered_months_ago is None:
        return None, "Registration age unknown"
    score = min(1.0, b.registered_months_ago / 18.0)
    return score, f"Registered {b.registered_months_ago} months ago"


# name -> (scorer, weight)
SIGNALS = {
    "registry_match":  (s_registry_match, 0.25),
    "activity_geo":    (s_activity_geo,   0.25),
    "transaction_geo": (s_transaction_geo, 0.20),
    "address_type":    (s_address_type,   0.20),
    "business_age":    (s_age,            0.10),
}


# ----------------------------------------------------------------------
# 4. CONTRADICTION DETECTION
# ----------------------------------------------------------------------
def find_contradictions(b: Business):
    out = []  # (description, penalty)

    # a) Activity cluster is somewhere else than the claimed address
    if len(b.activity_points) >= 3:
        c = centroid(b.activity_points)
        d = haversine_km(b.claimed_lat, b.claimed_lon, *c)
        if d > 1.0:
            out.append((f"Activity cluster is {d:.1f} km from the claimed address", 0.15))

    # b) Registry and transactions disagree
    if b.registry_lat is not None and len(b.transaction_points) >= 3:
        c = centroid(b.transaction_points)
        d = haversine_km(b.registry_lat, b.registry_lon, *c)
        if d > 1.0:
            out.append((f"Transactions are {d:.1f} km away from the registry address", 0.12))

    # c) Money flowing but nothing physically happening at the address
    if b.monthly_txn_volume > 0 and b.activity_points:
        f = frac_within(b.activity_points, b.claimed_lat, b.claimed_lon, 0.15)
        if f is not None and f < 0.1 and b.monthly_txn_volume > 50_000:
            out.append(("High transaction volume with no physical activity at address", 0.12))

    # d) Claims a storefront but address is virtual / residential
    if b.claims_storefront and b.address_type in ("virtual", "residential"):
        out.append((f"Claims customer-facing storefront but address type is '{b.address_type}'", 0.12))

    # e) Many entities share the address
    if b.other_businesses_at_address >= 15:
        out.append((f"{b.other_businesses_at_address} other businesses share this address (possible ghost address)", 0.12))

    # f) New business with unusually high volume
    if b.registered_months_ago is not None and b.registered_months_ago < 3 and b.monthly_txn_volume > 100_000:
        out.append(("Very new registration with unusually high volume", 0.10))

    return out


# ----------------------------------------------------------------------
# 5. FUSION + EXPLAINABLE SCORE
# ----------------------------------------------------------------------
def verify(b: Business):
    parts, total_w, used_w = [], 0.0, 0.0
    for name, (fn, w) in SIGNALS.items():
        score, why = fn(b)
        total_w += w
        if score is None:
            parts.append((name, None, w, why))
            continue
        used_w += w
        parts.append((name, score, w, why))

    coverage = used_w / total_w
    fused = sum(s * w for _, s, w, _ in parts if s is not None) / used_w

    contradictions = find_contradictions(b)
    penalty = min(0.45, sum(p for _, p in contradictions))
    confidence = max(0.0, fused - penalty)

    # Shrink toward 0.5 (uncertain) when evidence is thin
    confidence = 0.5 + (confidence - 0.5) * (0.5 + 0.5 * coverage)
    confidence = round(confidence * 100, 1)

    # Ambiguity: shared location with decent activity -> flag instead of condemning
    shared = b.address_type in ("coworking", "mixed") or 4 <= b.other_businesses_at_address < 15
    if confidence >= 70:
        label = "CREDIBLE"
    elif confidence >= 40 or (shared and confidence >= 30):
        label = "AMBIGUOUS / SHARED LOCATION"
    else:
        label = "SUSPICIOUS / POSSIBLE GHOST ADDRESS"

    return {
        "business": b.name,
        "confidence": confidence,
        "risk": round(100 - confidence, 1),
        "label": label,
        "coverage": round(coverage * 100),
        "signals": parts,
        "contradictions": contradictions,
    }


def explain(r):
    lines = [f"\n=== {r['business']} ===",
             f"Confidence: {r['confidence']}/100   Risk: {r['risk']}/100   -> {r['label']}",
             f"Evidence coverage: {r['coverage']}%",
             "Supporting signals:"]
    for name, score, w, why in r["signals"]:
        sc = "n/a " if score is None else f"{score:.2f}"
        lines.append(f"  [{sc}] (w={w:.2f}) {name}: {why}")
    if r["contradictions"]:
        lines.append("Contradictions detected:")
        for d, p in r["contradictions"]:
            lines.append(f"  ! {d}  (penalty -{p:.2f})")
    else:
        lines.append("Contradictions detected: none")
    lines.append("Disclaimer: decision-support indicator only, not a compliance decision.")
    return "\n".join(lines)


# ----------------------------------------------------------------------
# 6. SYNTHETIC DEMO: three business-location cases
# ----------------------------------------------------------------------
def jitter(lat, lon, n, spread_km, seed):
    import random
    rnd = random.Random(seed)
    pts = []
    for _ in range(n):
        dlat = rnd.uniform(-spread_km, spread_km) / 111.0
        dlon = rnd.uniform(-spread_km, spread_km) / (111.0 * math.cos(math.radians(lat)))
        pts.append((lat + dlat, lon + dlon))
    return pts


def demo_cases():
    LAT, LON = 18.5204, 73.8567

    credible = Business(
        name="Case A - Sharma Hardware (credible)",
        claimed_lat=LAT, claimed_lon=LON,
        registry_lat=LAT + 0.0003, registry_lon=LON + 0.0002,
        registered_months_ago=60, address_type="commercial",
        other_businesses_at_address=1,
        activity_points=jitter(LAT, LON, 25, 0.08, 1),
        transaction_points=jitter(LAT, LON, 40, 0.15, 2),
        monthly_txn_volume=40_000)

    ambiguous = Business(
        name="Case B - BrightLeaf Design (shared coworking)",
        claimed_lat=LAT + 0.02, claimed_lon=LON + 0.02,
        registry_lat=LAT + 0.02, registry_lon=LON + 0.02,
        registered_months_ago=10, address_type="coworking",
        other_businesses_at_address=12, claims_storefront=False,
        activity_points=jitter(LAT + 0.02, LON + 0.02, 6, 0.1, 3)
                        + jitter(LAT + 0.05, LON + 0.01, 4, 0.2, 4),
        transaction_points=jitter(LAT + 0.02, LON + 0.02, 8, 0.2, 5)
                           + jitter(LAT + 0.06, LON + 0.0, 4, 0.3, 6),
        monthly_txn_volume=20_000)

    ghost = Business(
        name="Case C - Apex Global Traders (ghost address)",
        claimed_lat=LAT - 0.03, claimed_lon=LON - 0.02,
        registry_lat=LAT + 0.08, registry_lon=LON + 0.07,   # registry elsewhere
        registered_months_ago=2, address_type="virtual",
        other_businesses_at_address=47, claims_storefront=True,
        activity_points=jitter(LAT + 0.10, LON + 0.09, 5, 0.1, 7),  # activity far away
        transaction_points=jitter(LAT + 0.10, LON + 0.09, 10, 0.2, 8),
        monthly_txn_volume=250_000)

    return [credible, ambiguous, ghost]


if __name__ == "__main__":
    for biz in demo_cases():
        print(explain(verify(biz)))
