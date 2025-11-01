const isLocal = window.location.hostname === "localhost";
const path = window.location.pathname;
const pageName = path === "/" ? "index.html" : path.substring(path.lastIndexOf("/") + 1);

const readyButton = document.getElementById("readyButton");
const readyStatus = document.getElementById("readyStatus");
const pageChangeTime = 2000;

let socket; // declaring but not connecting the socket
let isReady = false;
let adminSet = false;

if (isLocal && pageName !== "admin.html") {
    window.location.replace("pages/admin.html");
} else {
    socket = io();
    setupPage(socket);
}

function setupPage(socket) {
    if (pageName === "index.html") {
        socket.on("connect", () => {
            socket.emit("clientIdentity", { isLocal });
        });
        socket.on("reconnect", () => {
            console.log("Reconnected. Re-emitting identity...");
            socket.emit("clientIdentity", { isLocal });
        });

        registerReadyHandlers(socket);
    } else if (pageName === "emotion-wheel.html") {
        import("./emotionWheel.js").then(({ mainCircleInteraction }) => {
            mainCircleInteraction(socket);
        });
    } else if (pageName === "admin.html") {
        console.log("Admin page loaded");
    } else {
        console.log("Unexpected page:", pageName);
    }
}

function registerReadyHandlers() {
    readyButton.addEventListener("click", () => {
        if (isReady) return;
        isReady = true;

        socket.emit("clientReady");
        readyButton.disabled = true;
    });

    socket.on("updateReadyStatus", ({ readyCount, totalClients }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`;

        if (readyCount === totalClients && totalClients > 0) {
            readyButton.textContent = "READY";
            readyButton.disabled = false;
        }
    });

    socket.on("allReady", () => {
        readyButton.textContent = "Redirecting to next page...";
        console.log("All ready! Redirecting...");
        setTimeout(() => {
            if (!isLocal) {
                window.location.href = "pages/emotion-wheel.html";
            }
        }, pageChangeTime);
    });
}