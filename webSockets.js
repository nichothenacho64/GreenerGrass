const WS_URL = 'ws://192.168.0.25:8080';

const btn = document.getElementById('btn');
const valueEl = document.getElementById('value');
const statusEl = document.getElementById('status');

console.log(btn);
console.log(valueEl);


let ws;


function connect() {
    ws = new WebSocket(WS_URL);


    ws.addEventListener('open', () => {
        statusEl.textContent = 'Connected';
        btn.disabled = false;
    });


    ws.addEventListener('message', (ev) => {
        try {
            const data = JSON.parse(ev.data);
            if (data.type === 'random') {
                const n = Math.round(data.value * 1e6) / 1e6;
                valueEl.textContent = n;
            }
        } catch (err) {
            console.error('Failed to parse message', err);
        }
    });


    ws.addEventListener('close', () => {
        statusEl.textContent = 'Disconnected';
        btn.disabled = true;
        setTimeout(() => {
            statusEl.textContent = 'Reconnecting…';
            connect();
        }, 1000);
    });


    ws.addEventListener('error', (err) => {
        console.error('WebSocket error', err);
    });
}


btn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'getRandom' }));
    }
});


connect();