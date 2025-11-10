const nextPageButtons = document.querySelectorAll(".next-page-button");
const readyStatus = document.getElementById("readyStatus");

const waitingMessage = document.getElementById("waitingMessage") || null;
const waitingText = document.getElementById("waitingText") || null;
const waitingDots = document.getElementById("waitingDots") || null;
const midiButton = document.getElementById("midiButton") || null;

const pageChangeTime = 2000;
const restartSequenceTime = 10000; // ! should be 10000 unless there is testing
const dotChangeTime = 1000;
const directoryChangeIndex = 1;

const isLocal = window.location.hostname === "localhost";
const path = window.location.pathname;
const pageName = path === "/" ? "index.html" : path.substring(path.lastIndexOf("/") + 1);

const pageSequence = [
    "index.html",
    "choose-wheel.html",
    "emotion-wheel.html",
    "chat.html",
    "final-page.html"
];

let socket;
let isReady = false;
let windowName;
let currentPageIndex = 0;
let nextPageIndex = 0;

function initialiseClientType() {
    if (!window.name || window.name.trim() === "") {
        if (pageName === "pages/admin.html" || pageName === "admin.html" || isLocal) {
            window.name = "admin"; // mark as admin
        } else {
            const numUniqueClientIdentifiers = 10000;
            const clientIdentifier = Math.floor(Math.random() * numUniqueClientIdentifiers);
            window.name = `client-${clientIdentifier}`;
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
        if (readyStatus) {
            readyStatus.textContent = `${readyCount} / ${totalClients}`;
        }
        if (adminExists) {
            console.log("The admin is here!");
        }
    });
}

function setupPage() {
    const storedWheel = sessionStorage.getItem("chosenWheel") || "default";

    let primaryColour = "#121238";

    if (storedWheel === "highContrast") {
        primaryColour = "#202020ff";
    } else if (storedWheel === "random") {
        primaryColour = "#210d44ff";
    }

    document.documentElement.style.setProperty("--primary-colour", primaryColour);

    currentPageIndex = pageSequence.indexOf(pageName);

    if (pageName === "final-page.html") {
        console.log("Restarting for the next users!");

        setTimeout(() => {
            console.log("Resetting MIDI channels before restart...");
            socket.emit("resetMIDI");
        }, restartSequenceTime - pageChangeTime); // since the message may take a bit of time to send

        setTimeout(() => {
            console.log("Restarting sequence: redirecting to index.html");
            sessionStorage.removeItem("chosenWheel");
            window.location.href = isLocal ? "admin.html" : "../index.html";
        }, restartSequenceTime);

    } else if (pageName === "admin.html") {
        setupAdminFeedback(socket);

    } else {
        if (pageName === "emotion-wheel.html") {
            nextPageButtons.forEach(button => button.disabled = true);
            import("./scripts/emotionWheel.js").then(({ interactWithEmotionWheel }) => {
                interactWithEmotionWheel(socket);
            });
        }

        handleNextPageButtonClick();
        navigateToNextPage();
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
        }
        if (topLabels) {
            topLabels.textContent = feedbackText;
            console.log("Top scores updated");
        }
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

function handleNextPageButtonClick() {
    nextPageButtons.forEach(button => {
        button.addEventListener("click", () => {
            if (isReady) return;

            if (pageName === "pages/choose-wheel.html" || pageName === "choose-wheel.html") {
                const storedWheel = button.id;
                sessionStorage.setItem("chosenWheel", storedWheel); // using this instead of the server as it saves for each client
                console.log("Wheel stored:", storedWheel);
            }

            isReady = true;

            showWaitingMessage();

            socket.emit("clientReady");

            nextPageButtons.forEach(button => button.disabled = true);
        });
    });

    if (pageName === "emotion-wheel.html" && midiButton) {
        midiButton.addEventListener("click", () => {
            import("./scripts/emotionWheel.js").then(({ enableMIDIEmission }) => {
                console.log("Emotion wheel!");
                enableMIDIEmission(socket); // send MIDI for the current page
            });
        });
    }
}

function navigateToNextPage() {
    socket.on("updateReadyStatus", ({ readyCount, totalClients }) => {
        if (readyStatus) {
            readyStatus.textContent = `${readyCount} / ${totalClients}`;
        }
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
        }
        nextPageIndex = (currentPageIndex + 1) % pageSequence.length;
        currentPageIndex = nextPageIndex;

        // if (pageName === "choose-wheel.html" || pageName === "pages/choose-wheel.html") {
        //     const defaultLabelsButton = document.getElementById("default");
        //     const highContrastLabelsButton = document.getElementById("highContrast");
        //     const randomLabelsButton = document.getElementById("random");

        //     [defaultLabelsButton, highContrastLabelsButton, randomLabelsButton].forEach(button => {
        //         button.addEventListener("click", () => button.textContent = "Redirecting to next page...");
        //     });

        // } else {
        if (nextPageButtons.length > 0 && pageName !== "choose-wheel.html") {
            nextPageButtons.forEach(button => button.textContent = "Redirecting to next page...");
        }
        // }

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
if (!adminRedirected) { 
    initialiseSocket();
    setupPage();
}


