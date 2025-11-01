const readyButton = document.getElementById("readyButton");
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
        import("./emotionWheel.js").then(({ mainCircleInteraction }) => {
            mainCircleInteraction(socket);
        });
    } else if (pageName === "admin.html") {
        console.log("Admin page loaded");
    } else {
        console.warn("Unexpected page:", pageName);
    }
}

function registerReadyHandlers() {
    readyButton.addEventListener("click", () => {
        if (isReady) return;
        isReady = true;
        socket.emit("clientReady");
        readyButton.disabled = true;
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
        readyButton.textContent = "Redirecting to next page...";
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


