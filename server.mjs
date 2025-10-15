import { WebSocketServer } from 'ws';
const port = 8080;
const wss = new WebSocketServer({ port });

console.log(`WebSocket server listening on ws://localhost:${port}`);

wss.on('connection', (ws, req) => {
    console.log('Client connected');

     ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'getRandom') {
                const value = Math.random();
                ws.send(JSON.stringify({ type: 'random', value }));
            }
        } catch (err) {
            console.error('Invalid message from client:', message);
        }
    });

    ws.on('close', () => console.log('Client disconnected'));
});

/* 
connection process:
1. run a Python server on 8000 at python3 -m http.server 8000 (potentially make this a spawn later on)
2. run node server.mjs on a SEPARATE terminal window
3. Computer: http://localhost:8000/index.html
4. iPad: http://192.168.0.25:8000/

! changes: change Python server to 3000; make this a child process
! Check correspondence between the client and the server ! ! ! 
*/