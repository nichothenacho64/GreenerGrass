import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 3000;
const __filename = fileURLToPath(import.meta.url)
const baseDirectory = path.dirname(__filename)

const app = express();
const server = http.createServer(app);
const io = new Server(server); // the server manager for all

function setupSocketEvents(io) {
    const state = {
        clients: new Map(), // socket.id -> { isLocal: boolean, isReady: boolean }
    };

    io.on("connection", (socket) => {
        state.clients.set(socket.id, { isLocal: false, isReady: false }); // assume non local

        console.log(`[SOCKET.IO] User connected: ${socket.id}`);

        socket.on("clientIdentity", ({ isLocal }) => {
            const client = state.clients.get(socket.id);
            if (client) {
                client.isLocal = isLocal
            };
            updateReadyStatus(io, state);
        });

        handleChatEvents(io, socket);
        handleReadyEvents(io, socket, state);

        socket.on("disconnect", () => {
            state.clients.delete(socket.id);
            updateReadyStatus(io, state);
            console.log(`[SOCKET.IO] User disconnected: ${socket.id}`);
        });
    });
}


function handleChatEvents(io, socket) {
    socket.on("chat message", (data) => {
        console.log(`[CLIENT] ${data.user}: ${data.text}`);

        io.emit("chat message", {
            user: data.user,
            text: data.text,
            time: new Date().toLocaleTimeString(),
        });
    });
}

function handleReadyEvents(io, socket, state) {
    socket.on("clientReady", () => {
        const client = state.clients.get(socket.id);
        if (!client) return;
        client.isReady = true;
        updateReadyStatus(io, state);
    });
}


function updateReadyStatus(io, state) {
    const nonLocalClients = [...state.clients.values()].filter(c => !c.isLocal);
    const totalClients = nonLocalClients.length;
    const readyCount = nonLocalClients.filter(c => c.isReady).length;

    io.emit("updateReadyStatus", { readyCount, totalClients });
}


function startServer(server, port) {
    server.listen(port, () => {
        console.log(`[SERVER] Chat running at http://localhost:${port}`);
    });
}

app.use(express.static(baseDirectory));
setupSocketEvents(io);
startServer(server, PORT);


/* 
next:
1. Check roles clearly – establish who is the 'admin' (i.e. the localhost person)
2. The 'admin' can assign roles to each person (if necessary), or maybe the user chooses them
3. MIDI data should be sent to the Max patch
*/
