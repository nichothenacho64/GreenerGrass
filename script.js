const nextPageButton = document.getElementById("nextPageButton");
const readyStatus = document.getElementById("readyStatus");

const waitingMessage = document.getElementById("waitingMessage") || null;
const waitingText = document.getElementById("waitingText") || null;
const waitingDots = document.getElementById("waitingDots") || null;

const pageChangeTime = 2000;
const dotChangeTime = 1000;

const isLocal = window.location.hostname === "localhost";
const path = window.location.pathname;
const pageName = path === "/" ? "index.html" : path.substring(path.lastIndexOf("/") + 1);

let socket; // reference for now, it may/may not connect
let isReady = false;
let windowName; // for identifying the client/admin
let currentPageIndex = 0;

let currentPage = { file: pageName, step: 1 };

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

    socket.on("initialState", ({ readyCount, totalClients, adminExists, currentPageIndex: idx, currentPage: page }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`;
        if (adminExists) console.log("The admin is here!");

        currentPageIndex = idx ?? 0;
        currentPage = page ?? currentPage;
        console.log(`Initial page from server: ${currentPage.file} (step ${currentPage.step})`); // for when a client joins
    });

    socket.on("pageChanged", ({ currentPageIndex: idx, currentPage: page }) => { // reflecting the page change
        currentPageIndex = idx;
        currentPage = page;
        console.log(`Server updated page: ${page.file} (step ${page.step})`);
    });
}

function setupPage() {
    if (pageName === "index.html") {
        navigateToNextPage();

    } else if (pageName === "whitespace-page.html") {
        navigateToNextPage();

    } else if (pageName === "two-choices.html") {
        navigateToNextPage();

    } else if (pageName === "emotion-wheel.html") {
        nextPageButton.disabled = true;
        import("./scripts/emotionWheel.js").then(({ interactWithEmotionWheel }) => {
            interactWithEmotionWheel(socket);
        });
        navigateToNextPage();

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

function navigateToNextPage() {
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

    socket.on("updateReadyStatus", ({ readyCount, totalClients }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`;
        if (waitingText) {
            waitingText.textContent = totalClients > 2
                ? "Waiting for other people"
                : "Waiting for the other person";
        }
    });

    socket.on("allReady", ({ currentPageIndex: idx, currentPage: page }) => {
        currentPageIndex = idx;
        currentPage = page; // the current page is the next page

        const { file, step } = currentPage;
        nextPageButton.textContent = "Redirecting to next page...";
        console.log(`All ready! Moving to: ${file} (step ${step})`);
        socket.emit("incrementPage");

        setTimeout(() => {
            if (!isLocal) {
                window.location.href = file;
            }
        }, pageChangeTime);
    });

}

initialiseClientType();
const adminRedirected = redirectAdmin();
if (!adminRedirected) { // only setting up the page IF the given client is NOT an admin
    initialiseSocket();
    setupPage();
}

// add a proper ending –> from the end page BACK to index.html
// there should be a 10-15 second wait before the installation restarts
// upon this restart, there should also be a MIDI reset triggered


