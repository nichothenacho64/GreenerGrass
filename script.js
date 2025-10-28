const socket = io();

const isLocal = window.location.hostname === "localhost";
const path = window.location.pathname;
const pageName = path === "/" ? "index.html" : path.substring(path.lastIndexOf("/") + 1);

const messages = document.getElementById("messages");
const username = document.getElementById("username");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const readyButton = document.getElementById("readyButton");
const readyStatus = document.getElementById("readyStatus");

const pageChangeTime = 2000;

let isReady = false;

function initaliseChat() {
    registerEventListeners();
    registerSocketHandlers();
    registerReadyHandlers();
}

function emitClientIdentity() {
    socket.on("connect", () => {
        console.log("Connected to server. Emitting identity...");
        socket.emit("clientIdentity", { isLocal });
    });

    socket.on("reconnect", () => {
        console.log("Reconnected. Re-emitting identity...");
        socket.emit("clientIdentity", { isLocal });
    });
}

function registerEventListeners() {
    sendButton.addEventListener("click", handleSendMessage);
    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            handleSendMessage()
        };
    });
}

function registerSocketHandlers() {
    socket.on("chat message", (data) => displayMessage(data));
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
        readyButton.textContent = "READY";
        console.log("All ready! Redirecting...");
        setTimeout(() => {
            window.location.href = "/emotion-wheel.html";
        }, pageChangeTime);
    });
}

function handleSendMessage() {
    const text = messageInput.value.trim();
    const user = username.value.trim() || "Anonymous";
    if (!text) return;

    socket.emit("chat message", { user, text });
    messageInput.value = "";
}

function displayMessage({ user, text, time }) {
    const messageElement = document.createElement("div");
    messageElement.className = "message";
    messageElement.innerHTML = `
    <span class="user">${user}:</span> ${text}
    <span class="timestamp">${time}</span>
  `;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
}

emitClientIdentity()
if (pageName === "index.html") {
    initaliseChat();
} else if (pageName === "emotion-wheel.html") {
    import("./emotionWheel.js").then(({ mainCircleInteraction }) => {
        console.log("Circle interaction!");
        mainCircleInteraction(socket);
    });
} else {
    console.log("This is a problem...");
}