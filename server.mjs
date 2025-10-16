const role = window.location.search.includes('host') ? 'host' : 'client';
const status = document.getElementById('status');
const btn = document.getElementById('btn');
const numberDisplay = document.getElementById('number');

const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

ws.onopen = () => {
    status.textContent = 'Connected ✅';
    ws.send(JSON.stringify({ type: 'register', role }));
};

ws.onmessage = e => {
    const data = JSON.parse(e.data);
    if (role === 'host' && data.type === 'random') {
        numberDisplay.textContent = `Client ${data.clientId}: ${data.value.toFixed(5)}`;
    }
    if (role === 'client') {
        if (data.type === 'sent') status.textContent = `Number sent ✅ (${data.value.toFixed(5)})`;
        if (data.type === 'error') status.textContent = `Error: ${data.message}`;
    }
};

ws.onclose = () => { status.textContent = 'Disconnected ❌ – retrying...'; setTimeout(() => location.reload(), 2000); };

btn.addEventListener('click', () => {
    if (role === 'client' && ws.readyState === 1) ws.send(JSON.stringify({ type: 'getRandom' }));
    if (role === 'host') status.textContent = 'Host cannot generate numbers';
});
