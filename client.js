// Set role via URL: ?host for host, default = client
const role = window.location.search.includes('host') ? 'host' : 'client';

const status = document.getElementById("status");
const button = document.getElementById("btn");
const numberDisplay = document.getElementById("number");

const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

ws.onopen = () => {
    status.textContent = "Connected ✅";

    // Register role
    ws.send(JSON.stringify({ type: 'register', role }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (role === 'host' && data.type === 'random') {
        // Host receives random numbers from clients
        numberDisplay.textContent = `Client ${data.clientId}: ${data.value.toFixed(5)}`;
    }

    if (role === 'client') {
        if (data.type === 'sent') {
            status.textContent = `Number sent to host ✅ (${data.value.toFixed(5)})`;
        }
        if (data.type === 'error') {
            status.textContent = `Error: ${data.message} ❌`;
        }
    }
};

ws.onclose = () => {
    status.textContent = "Disconnected ❌ – retrying...";
    setTimeout(() => location.reload(), 2000);
};

button.addEventListener("click", () => {
    if (role === "client" && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "getRandom" }));
    }
    if (role === "host") {
        status.textContent = "Host cannot generate numbers";
    }
});
