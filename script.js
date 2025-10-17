const socket = io(); // client function to connect to the server

const messages = document.getElementById("messages");
const username = document.getElementById("username");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

function initaliseChat() {
    registerEventListeners();
    registerSocketHandlers();
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