const nextPageButton = document.getElementById("nextPageButton");
const readyStatus = document.getElementById("readyStatus");
const pageChangeTime = 2000;

const isLocal = window.location.hostname === "localhost";
const path = window.location.pathname;
const pageName = path === "/" ? "index.html" : path.substring(path.lastIndexOf("/") + 1);

let socket; // reference for now, it may/may not connect
let isReady = false;
let windowName; // for identifying the client/admin

function initialiseClientType() {
    if (!window.name || window.name.trim() === "") {
        if (pageName === "pages/admin.html" || pageName === "admin.html" || isLocal) {
            window.name = "admin"; // mark as admin
        } else {
            const numUniqueClientIdentifiers = 10000
            const clientIdentifier = Math.floor(Math.random() * numUniqueClientIdentifiers)
            window.name = `client-${clientIdentifier}`; // unique client
        }
    }
    windowName = window.name;
}

function redirectAdmin() {
    if (isLocal && pageName !== "admin.html") {
        window.name = "admin"; // for ensuring that the admin's identity is set
        window.location.replace("pages/admin.html");
        return true; // true means that a redirect occured
    }
    return false;
}

function initialiseSocket() {
    socket = io();

    socket.on("connect", () => socket.emit("clientIdentity", { windowName }));
    socket.on("reconnect", () => socket.emit("clientIdentity", { windowName }));
}


function setupPage() {
    if (pageName === "index.html") {
        registerReadyHandlers();
    } else if (pageName === "emotion-wheel.html") { 
        import("./scripts/emotionWheel.js").then(({ mainCircleInteraction }) => {
            mainCircleInteraction(socket);
        });
    } else if (pageName === "admin.html") {
        console.log("Admin page loaded");
        setupAdminFeedback(socket); 
    } else {
        console.warn("Unexpected page:", pageName);
    }
}

function setupAdminFeedback(socket) { // for the results for the admin page
    const coordsDisplay = document.getElementById("coords");
    const topLabels = document.getElementById("topLabels");
    const resetButton = document.getElementById("resetButton");

    socket.on("updateClientFeedback", ({ coordsText, feedbackText }) => { // changing results
        if (coordsDisplay) { 
            coordsDisplay.textContent = coordsText; 
            console.log("P/A updated");
        };
        if (topLabels) {
            topLabels.textContent = feedbackText;
            console.log("Top scores updated");
        };
    });

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            socket.emit("resetMIDI");
        });
    }
}

function registerReadyHandlers() {
    nextPageButton.addEventListener("click", () => {
        if (isReady) return;
        isReady = true;
        socket.emit("clientReady");
        nextPageButton.disabled = true; // ! add something about waiting for the other
    });

    socket.on("initialState", ({ readyCount, totalClients, adminExists }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`;
        if (adminExists) {
            console.log("Admin already present!")
        };
    });

    socket.on("updateReadyStatus", ({ readyCount, totalClients }) => { // standard updating
        readyStatus.textContent = `${readyCount} / ${totalClients}`;
        console.log("Ready status updated");
    });

    socket.on("allReady", () => {
        nextPageButton.textContent = "Redirecting to next page...";
        console.log("All ready! Redirecting...");
        setTimeout(() => {
            if (!isLocal) {
                window.location.href = "pages/emotion-wheel.html"
            };
        }, pageChangeTime);
    });
}

initialiseClientType();
const adminRedirected = redirectAdmin();
if (!adminRedirected) {
    console.log("Socket initialised");
    initialiseSocket();
    setupPage();
}


