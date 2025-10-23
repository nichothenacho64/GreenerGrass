const socket = io();

const isLocal = window.location.hostname === "localhost";

socket.on("connect", () => { // whether the client is local or not
    socket.emit("clientIdentity", { isLocal });
});


const messages = document.getElementById("messages");
const username = document.getElementById("username");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const readyButton = document.getElementById("readyButton");
const readyStatus = document.getElementById("readyStatus");

let isReady = false;

function initaliseChat() {
    registerEventListeners();
    registerSocketHandlers();
    registerReadyHandlers();
}

function registerEventListeners() {
    sendButton.addEventListener("click", handleSendMessage);
    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSendMessage()
        };
    });
}

function registerSocketHandlers() {
    socket.on("chat message", (data) => displayMessage(data));
}

function registerReadyHandlers() {
    readyButton.addEventListener("click", () => {
        if (isReady) return; // prevent double-click
        isReady = true;
        socket.emit("clientReady");
    });

    socket.on("updateReadyStatus", ({ readyCount, totalClients }) => {
        readyStatus.textContent = `${readyCount} / ${totalClients}`;

        if (readyCount === totalClients && totalClients > 0) {
            readyButton.textContent = "READY";
            readyButton.disabled = false;

            setTimeout(() => { // redirect after delay
                window.location.href = "/emotion-wheel.html";
            }, 1000);
        }
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

initaliseChat();