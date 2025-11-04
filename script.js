const nextPageButton = document.getElementById("nextPageButton");
const readyStatus = document.getElementById("readyStatus");

const waitingMessage = document.getElementById("waitingMessage") || null;
const waitingText = document.getElementById("waitingText") || null;
const waitingDots = document.getElementById("waitingDots") || null;

const pageChangeTime = 2000;
const dotChangeTime = 1000;
// const totalPages = 6;

const isLocal = window.location.hostname === "localhost";
const path = window.location.pathname;
const pageName = path === "/" ? "index.html" : path.substring(path.lastIndexOf("/") + 1);


let socket; // reference for now, it may/may not connect
let isReady = false;
let windowName; // for identifying the client/admin
let currentPageIndex = 0; 


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
        navigateToNextPage("pages/whitespace-page.html");

    } else if (pageName === "whitespace-page.html") {
        navigateToNextPage("two-choices.html");

    } else if (pageName === "emotion-wheel.html") { // in folder already, no need for pages/
        nextPageButton.disabled = true;
        import("./scripts/emotionWheel.js").then(({ interactWithEmotionWheel }) => {
            interactWithEmotionWheel(socket);
        });
        navigateToNextPage("two-choices.html"); // attempting to implement this on every page

    } else if (pageName === "admin.html") {
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

function showWaitingMessage() {
    if (waitingMessage && waitingDots) {
        waitingMessage.classList.add("visible"); // the fade in happens here

        let dotCount = 1; // starting on one dot
        waitingDots.textContent = ".".repeat(dotCount);

        const maxDots = 3;
        const dotInterval = setInterval(() => {
            dotCount = (dotCount % maxDots) + 1;
            waitingDots.textContent = ".".repeat(dotCount);
        }, dotChangeTime);

        socket.on("allReady", () => {
            clearInterval(dotInterval);
            waitingMessage.classList.remove("visible");
        });
    }
}

function navigateToNextPage(nextPage) { // add another optional parameter about the type (maybe a map)
    nextPageButton.addEventListener("click", () => {
        if (isReady) return;
        isReady = true;

        showWaitingMessage();

        if (pageName === "emotion-wheel.html") {
            import("./scripts/emotionWheel.js").then(({ enableMIDIEmission }) => {
                enableMIDIEmission(socket);
            });
        }

        socket.emit("clientReady");
        nextPageButton.disabled = true;
    });


    socket.on("initialState", ({ readyCount, totalClients, adminExists, currentPage }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`; // when a client joins

        if (adminExists) console.log("The admin is here!");

        if (typeof currentPage === "number") {
            currentPageIndex = currentPage; // from the server
        } else {
            currentPageIndex = currentPageIndex; // fallback
        }
    });


    socket.on("updateReadyStatus", ({ readyCount, totalClients }) => { // standard updating
        readyStatus.textContent = `${readyCount} / ${totalClients}`;
        console.log("Ready status updated");

        if (waitingText) {
            waitingText.textContent = totalClients > 2
                ? "Waiting for other people"
                : "Waiting for the other person";
        }
    });

    socket.on("allReady", () => { // moving to the next page, should change the text contexgt
        nextPageButton.textContent = "Redirecting to next page...";
        console.log("All ready! Redirecting...");
        socket.emit("incrementPage");
        setTimeout(() => {
            if (!isLocal) {
                window.location.href = nextPage;
            };
        }, pageChangeTime);
    });

    socket.on("pageChanged", ({ currentPage }) => { // forwhen another client moves pages
        currentPageIndex = currentPage;
    });
}

initialiseClientType();
const adminRedirected = redirectAdmin();
if (!adminRedirected) {
    console.log("Socket initialised");
    initialiseSocket();
    setupPage();
}

// a few things to add
// 1. a proper ending –> from the end page BACK to index.html


