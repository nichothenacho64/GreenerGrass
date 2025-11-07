const nextPageButtons = document.querySelectorAll(".next-page-button"); 
const readyStatus = document.getElementById("readyStatus");

const waitingMessage = document.getElementById("waitingMessage") || null;
const waitingText = document.getElementById("waitingText") || null;
const waitingDots = document.getElementById("waitingDots") || null;

const pageChangeTime = 2000;
const dotChangeTime = 1000;
const directoryChangeIndex = 1;

const isLocal = window.location.hostname === "localhost";
const path = window.location.pathname;
const pageName = path === "/" ? "index.html" : path.substring(path.lastIndexOf("/") + 1);

let socket;
let isReady = false;
let windowName; // for identifying the client/admin
let currentPageIndex = 0;
let nextPageIndex = 0;

const pageSequence = [
    "index.html",
    "choose-wheel.html",
    "emotion-wheel.html",
    "chat.html",
    "final-page.html"
];

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

    socket.on("initialState", ({ readyCount, totalClients, adminExists }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`;
        if (adminExists) console.log("The admin is here!");
    });
}

function setupPage() {
    console.log('Texted name', pageName);
    currentPageIndex = pageSequence.indexOf(pageName);
    console.log('Current page:', pageSequence[currentPageIndex]);
    console.log('Next page:', pageSequence[(currentPageIndex + 1) % pageSequence.length]);

    if (pageName === "index.html") {
        // navigateToNextPage("pages/choose-wheel.html");
        navigateToNextPage();

    } else if (pageName === "chat.html") {
        // navigateToNextPage("final-page.html");
        navigateToNextPage();

    } else if (pageName === "choose-wheel.html") {
        // navigateToNextPage("emotion-wheel.html");
        navigateToNextPage();

    } else if (pageName === "emotion-wheel.html") {
        nextPageButtons.forEach(button => button.disabled = true);
        import("./scripts/emotionWheel.js").then(({ interactWithEmotionWheel }) => {
            interactWithEmotionWheel(socket);
        });
        // navigateToNextPage("chat.html");
        navigateToNextPage();

    } else if (pageName === "admin.html") {
        // setupAdminFeedback(socket);
        navigateToNextPage();

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
    nextPageButtons.forEach(button => {
        button.addEventListener("click", () => {
            if (isReady) return;
            isReady = true;

            showWaitingMessage();

            console.log(`Button clicked: ${button.textContent.trim()}`);

            if (pageName === "emotion-wheel.html") {
                import("./scripts/emotionWheel.js").then(({ enableMIDIEmission }) => {
                    enableMIDIEmission(socket); // send MIDI for the current page
                });
            }

            socket.emit("clientReady"); // signal ready first

            nextPageButtons.forEach(button => button.disabled = true);
        });
    });

    socket.on("updateReadyStatus", ({ readyCount, totalClients }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`;
        if (waitingText) {
            waitingText.textContent = totalClients > 2
                ? "Waiting for other people"
                : "Waiting for the other person";
        }
    });

    socket.on("allReady", () => {
        currentPageIndex = pageSequence.indexOf(pageName);
        if (currentPageIndex === -1) { 
            currentPageIndex = 0;
            console.warn("Returning to index.html as the page's index was not found"); 
        };  
        nextPageIndex = (currentPageIndex + 1) % pageSequence.length;
        currentPageIndex = nextPageIndex;

        nextPageButtons.forEach(button => button.textContent = "Redirecting to next page...");
        console.log(`Next page prepared: ${pageSequence[currentPageIndex]}`);

        setTimeout(() => {
            if (!isLocal) {
                if (nextPageIndex === directoryChangeIndex) {
                    window.location.href = "pages/" + pageSequence[currentPageIndex]; 
                } else {
                    window.location.href = pageSequence[currentPageIndex]; 
                }
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


