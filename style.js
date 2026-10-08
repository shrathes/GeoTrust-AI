// ============================================================
// GeoPulse AI - Trading Address Verification
// Complete JavaScript for the provided HTML
// ============================================================


// ============================================================
// CASE DATA
// ============================================================

const caseData = {

    A: {
        name: "Apex Logistics Warehouse Hub",
        address: "Sector 62, Industrial Zone, Dock #4, Greenfield",
        industry: "logistics",
        building: "industrial",

        activity: 88,
        colocation: 2,
        transactions: 350,

        score: 94
    },

    B: {
        name: "Virtual Capital Ltd",
        address: "Apartment 12B, Residential Block, Greenfield",
        industry: "financial",
        building: "residential",

        activity: 5,
        colocation: 42,
        transactions: 20,

        score: 12
    },

    C: {
        name: "WeWork Hub - Tech Corp Suite 402",
        address: "Tech Park, Suite 402, Greenfield",
        industry: "tech",
        building: "coworking",

        activity: 78,
        colocation: 25,
        transactions: 300,

        score: 72
    }

};


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let fusionRadarChart = null;


// ============================================================
// TAB SWITCHING
// ============================================================

function switchTab(tab) {

    console.log("Switching tab:", tab);

    const inspector =
        document.getElementById("view-inspector");

    const fusion =
        document.getElementById("view-fusion");

    const graph =
        document.getElementById("view-graph");


    const tabInspector =
        document.getElementById("tab-inspector");

    const tabFusion =
        document.getElementById("tab-fusion");

    const tabGraph =
        document.getElementById("tab-graph");


    // Hide all sections

    inspector.classList.add("hidden");
    fusion.classList.add("hidden");
    graph.classList.add("hidden");


    // Reset buttons

    tabInspector.classList.remove(
        "bg-indigo-600",
        "text-white",
        "shadow"
    );

    tabInspector.classList.add("text-gray-400");


    tabFusion.classList.remove(
        "bg-indigo-600",
        "text-white",
        "shadow"
    );

    tabFusion.classList.add("text-gray-400");


    tabGraph.classList.remove(
        "bg-indigo-600",
        "text-white",
        "shadow"
    );

    tabGraph.classList.add("text-gray-400");


    // Show selected section

    if (tab === "inspector") {

        inspector.classList.remove("hidden");

        tabInspector.classList.remove("text-gray-400");

        tabInspector.classList.add(
            "bg-indigo-600",
            "text-white",
            "shadow"
        );

        drawMiniGraph();

    }


    if (tab === "fusion") {

        fusion.classList.remove("hidden");

        tabFusion.classList.remove("text-gray-400");

        tabFusion.classList.add(
            "bg-indigo-600",
            "text-white",
            "shadow"
        );

        createFusionRadar();

    }


    if (tab === "graph") {

        graph.classList.remove("hidden");

        tabGraph.classList.remove("text-gray-400");

        tabGraph.classList.add(
            "bg-indigo-600",
            "text-white",
            "shadow"
        );

        drawFullGraph();

    }

}


// ============================================================
// LOAD CASE A / B / C
// ============================================================

function loadCase(caseId) {

    console.log("Loading case:", caseId);


    const data = caseData[caseId];


    if (!data) {

        console.error("Case not found:", caseId);

        return;

    }


    // --------------------------------------------------------
    // INPUT VALUES
    // --------------------------------------------------------

    document.getElementById("input-name").value =
        data.name;


    document.getElementById("input-address").value =
        data.address;


    document.getElementById("input-industry").value =
        data.industry;


    document.getElementById("input-building").value =
        data.building;


    // --------------------------------------------------------
    // SLIDERS
    // --------------------------------------------------------

    document.getElementById("slider-activity").value =
        data.activity;


    document.getElementById("slider-colocation").value =
        data.colocation;


    document.getElementById("slider-tx").value =
        data.transactions;


    // Update slider labels

    updateSliders();


    // Highlight selected case

    highlightCase(caseId);


    // Run verification

    runAnalysis();

}


// ============================================================
// HIGHLIGHT SELECTED CASE
// ============================================================

function highlightCase(caseId) {

    const buttons = ["A", "B", "C"];


    buttons.forEach(function(id) {

        const element =
            document.getElementById("case-btn-" + id);


        if (!element) return;


        element.classList.remove(
            "ring-2",
            "ring-cyan-400",
            "shadow-lg"
        );

    });


    const selected =
        document.getElementById("case-btn-" + caseId);


    if (selected) {

        selected.classList.add(
            "ring-2",
            "ring-cyan-400",
            "shadow-lg"
        );

    }

}


// ============================================================
// UPDATE SLIDER VALUES
// ============================================================

function updateSliders() {

    const activity =
        document.getElementById("slider-activity").value;


    const colocation =
        document.getElementById("slider-colocation").value;


    const transactions =
        document.getElementById("slider-tx").value;


    // Activity

    document.getElementById("val-activity").textContent =
        activity + " / 100";


    // Co-tenancy

    document.getElementById("val-colocation").textContent =
        colocation + " Entities";


    // Transactions

    document.getElementById("val-tx").textContent =
        transactions + " Tx/day";

}


// ============================================================
// MAIN ANALYSIS
// ============================================================

function runAnalysis() {

    console.log("Running GeoPulse analysis...");


    const activity =
        Number(
            document.getElementById("slider-activity").value
        );


    const colocation =
        Number(
            document.getElementById("slider-colocation").value
        );


    const transactions =
        Number(
            document.getElementById("slider-tx").value
        );


    // --------------------------------------------------------
    // CALCULATE SCORE
    // --------------------------------------------------------

    /*
        Activity       = 40%
        Transaction    = 35%
        Co-tenancy     = 25%

        Lower co-tenancy is better.
    */


    const activityScore =
        activity;


    const transactionScore =
        Math.min(
            (transactions / 350) * 100,
            100
        );


    let colocationScore =
        100 - ((colocation - 1) / 49) * 100;


    colocationScore =
        Math.max(
            0,
            Math.min(100, colocationScore)
        );


    let score =
        (activityScore * 0.40) +
        (transactionScore * 0.35) +
        (colocationScore * 0.25);


    score =
        Math.round(score);


    // Limit between 0 and 100

    score =
        Math.max(
            0,
            Math.min(100, score)
        );


    // --------------------------------------------------------
    // UPDATE OUTPUT
    // --------------------------------------------------------

    updateScore(score);

    updateRisk(score);

    updateSignals(
        activity,
        colocation,
        transactions,
        score
    );


    // Update charts

    createFusionRadar(
        activity,
        colocation,
        transactions
    );


    drawMiniGraph();

}


// ============================================================
// UPDATE SCORE
// ============================================================

function updateScore(score) {

    const scoreText =
        document.getElementById("out-score");


    const scoreCircle =
        document.getElementById("score-circle");


    scoreText.textContent =
        score + "%";


    // SVG progress

    scoreCircle.setAttribute(
        "stroke-dasharray",
        score + ", 100"
    );


    // Color

    scoreCircle.classList.remove(
        "text-emerald-500",
        "text-amber-500",
        "text-rose-500"
    );


    if (score >= 75) {

        scoreCircle.classList.add(
            "text-emerald-500"
        );

    }

    else if (score >= 50) {

        scoreCircle.classList.add(
            "text-amber-500"
        );

    }

    else {

        scoreCircle.classList.add(
            "text-rose-500"
        );

    }

}


// ============================================================
// UPDATE RISK
// ============================================================

function updateRisk(score) {

    const badge =
        document.getElementById("out-badge");


    const title =
        document.getElementById("out-title");


    const description =
        document.getElementById("out-desc");


    const risk =
        document.getElementById("out-risk-level");


    const contradiction =
        document.getElementById("out-contradiction");


    // --------------------------------------------------------
    // LOW RISK
    // --------------------------------------------------------

    if (score >= 75) {

        badge.textContent =
            "CREDIBLE TRADING LOCATION";

        badge.className =
            "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400";


        title.textContent =
            "High Credibility Verification";


        description.textContent =
            "Strong spatiotemporal activity alignment. Low co-tenancy entropy with matching transaction pulses.";


        risk.textContent =
            "LOW RISK (" + (100 - score) + "%)";


        risk.className =
            "font-bold text-emerald-400";


        contradiction.textContent =
            "0.02 (CLEAN)";

    }


    // --------------------------------------------------------
    // MEDIUM RISK
    // --------------------------------------------------------

    else if (score >= 50) {

        badge.textContent =
            "AMBIGUOUS TRADING LOCATION";

        badge.className =
            "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400";


        title.textContent =
            "Additional Verification Recommended";


        description.textContent =
            "The address shows genuine activity, but co-tenancy or transaction signals create ambiguity.";


        risk.textContent =
            "MEDIUM RISK (" + (100 - score) + "%)";


        risk.className =
            "font-bold text-amber-400";


        contradiction.textContent =
            "0.31 (AMBIGUOUS)";

    }


    // --------------------------------------------------------
    // HIGH RISK
    // --------------------------------------------------------

    else {

        badge.textContent =
            "SUSPICIOUS / GHOST ADDRESS";

        badge.className =
            "px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400";


        title.textContent =
            "Low Credibility Verification";


        description.textContent =
            "Very low physical activity and high address density indicate a possible ghost or shell address.";


        risk.textContent =
            "HIGH RISK (" + (100 - score) + "%)";


        risk.className =
            "font-bold text-rose-400";


        contradiction.textContent =
            "0.86 (HIGH CONTRADICTION)";

    }

}


// ============================================================
// SUPPORTING SIGNALS + RISK FACTORS
// ============================================================

function updateSignals(
    activity,
    colocation,
    transactions,
    score
) {

    const positive =
        document.getElementById("list-positive");


    const negative =
        document.getElementById("list-negative");


    positive.innerHTML = "";

    negative.innerHTML = "";


    // --------------------------------------------------------
    // ACTIVITY
    // --------------------------------------------------------

    if (activity >= 70) {

        addPositive(
            "Strong physical activity pulse detected."
        );

    }
    else {

        addNegative(
            "Very low physical activity detected."
        );

    }


    // --------------------------------------------------------
    // CO-TENANCY
    // --------------------------------------------------------

    if (colocation <= 5) {

        addPositive(
            "Low co-tenancy density supports address uniqueness."
        );

    }
    else if (colocation <= 20) {

        addPositive(
            "Moderate co-tenancy detected; location remains plausible."
        );

    }
    else {

        addNegative(
            colocation +
            " entities share the claimed location."
        );

    }


    // --------------------------------------------------------
    // TRANSACTIONS
    // --------------------------------------------------------

    if (transactions >= 250) {

        addPositive(
            "Transaction volume is consistent with the claimed activity."
        );

    }
    else {

        addNegative(
            "Declared transaction volume is relatively low."
        );

    }


    // --------------------------------------------------------
    // FINAL SCORE
    // --------------------------------------------------------

    if (score >= 75) {

        addPositive(
            "Overall signal fusion strongly supports credibility."
        );

    }
    else if (score >= 50) {

        addNegative(
            "Signals are mixed; manual verification is recommended."
        );

    }
    else {

        addNegative(
            "Multiple signals contradict the claimed trading location."
        );

    }

}


// ============================================================
// ADD POSITIVE SIGNAL
// ============================================================

function addPositive(text) {

    const list =
        document.getElementById("list-positive");


    const li =
        document.createElement("li");


    li.className =
        "flex items-start gap-2";


    li.innerHTML = `
        <i class="fa-solid fa-circle-check text-emerald-400 mt-0.5"></i>
        <span>${text}</span>
    `;


    list.appendChild(li);

}


// ============================================================
// ADD NEGATIVE SIGNAL
// ============================================================

function addNegative(text) {

    const list =
        document.getElementById("list-negative");


    const li =
        document.createElement("li");


    li.className =
        "flex items-start gap-2";


    li.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation text-rose-400 mt-0.5"></i>
        <span>${text}</span>
    `;


    list.appendChild(li);

}


// ============================================================
// FUSION RADAR CHART
// ============================================================

function createFusionRadar(
    activity = 88,
    colocation = 2,
    transactions = 350
) {

    const canvas =
        document.getElementById("fusionRadarChart");


    if (!canvas) {

        return;

    }


    // If chart already exists, destroy it

    if (fusionRadarChart) {

        fusionRadarChart.destroy();

    }


    // Convert values to 0-100

    const transactionScore =
        Math.min(
            (transactions / 350) * 100,
            100
        );


    const colocationScore =
        Math.max(
            0,
            100 - ((colocation - 1) / 49) * 100
        );


    const ctx =
        canvas.getContext("2d");


    fusionRadarChart =
        new Chart(ctx, {

            type: "radar",

            data: {

                labels: [
                    "Kinetic Activity",
                    "Spatial Uniqueness",
                    "Transaction Match",
                    "Registry",
                    "Temporal Consistency"
                ],

                datasets: [

                    {

                        label: "GeoPulse Signal Strength",

                        data: [
                            activity,
                            colocationScore,
                            transactionScore,
                            90,
                            Math.round(
                                (
                                    activity +
                                    colocationScore +
                                    transactionScore
                                ) / 3
                            )
                        ],

                        borderColor: "#06b6d4",

                        backgroundColor:
                            "rgba(6, 182, 212, 0.15)",

                        pointBackgroundColor:
                            "#06b6d4",

                        borderWidth: 2

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    r: {

                        min: 0,

                        max: 100,

                        ticks: {

                            color: "#9ca3af",

                            backdropColor:
                                "transparent"

                        },

                        grid: {

                            color:
                                "rgba(255,255,255,0.08)"

                        },

                        angleLines: {

                            color:
                                "rgba(255,255,255,0.08)"

                        },

                        pointLabels: {

                            color: "#d1d5db",

                            font: {

                                size: 11

                            }

                        }

                    }

                },

                plugins: {

                    legend: {

                        labels: {

                            color: "#d1d5db"

                        }

                    }

                }

            }

        });

}


// ============================================================
// MINI GRAPH
// ============================================================

function drawMiniGraph() {

    const canvas =
        document.getElementById("mini-graph-canvas");


    if (!canvas) {

        return;

    }


    const container =
        canvas.parentElement;


    canvas.width =
        container.clientWidth;

    canvas.height =
        container.clientHeight;


    const ctx =
        canvas.getContext("2d");


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const width =
        canvas.width;

    const height =
        canvas.height;


    // --------------------------------------------------------
    // NODES
    // --------------------------------------------------------

    const nodes = [

        {
            x: width * 0.15,
            y: height * 0.50,
            label: "Business",
            color: "#