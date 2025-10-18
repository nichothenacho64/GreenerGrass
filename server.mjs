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

function setupRoutes(app, baseDirectory) { // static routes for client files
    app.get("/", (_, response) => response.sendFile(path.join(baseDirectory, "index.html")));
    app.get("/script.js", (_, response) => response.sendFile(path.join(baseDirectory, "script.js")));
}

function setupSocketEvents(io) { // event handling
    io.on("connection", (socket) => {
        console.log(`[SOCKET.IO] User connected: ${socket.id}`);

        socket.on("chat message", (data) => {
            console.log(`[CLIENT] ${data.user}: ${data.text}`);
            io.emit("chat message", {
                user: data.user,
                text: data.text,
                time: new Date().toLocaleTimeString(),
            });
        });

        socket.on("disconnect", () => {
            console.log(`[SOCKET.IO] User disconnected: ${socket.id}`);
        });
    });
}

function startServer(server, port) {
    server.listen(port, () => {
        console.log(`[SERVER] Chat running at http://localhost:${port}`);
    });
}


function main() {
    setupRoutes(app, baseDirectory);
    setupSocketEvents(io);
    startServer(server, PORT);
}

main();

/* 
next:
1. Check roles clearly – establish who is the 'admin' (i.e. the localhost person)
2. The 'admin' can assign roles to each person (if necessary), or maybe the user chooses them
3. MIDI data should be sent to the Max patch
*/
