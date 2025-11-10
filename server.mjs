import {
    logAdminMessage,
    logClientMessage,
    logMIDIMessage,
    logServerMessage,
    logSocketMessage
} from "./scripts/serverLogger.js";

import easymidi from "easymidi";
import express from "express";
import { fileURLToPath } from "url";
import http from "http";
import path from "path";
import { Server } from "socket.io";

const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const baseDirectory = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server); // the server manager for all

function setupSocketEvents(io) {
    const state = {
        clients: new Map(),
    };

    io.on("connection", (socket) => {
        state.clients.set(socket.id, { isLocal: false, isReady: false, identified: false });

        const nonLocalClients = [...state.clients.values()].filter(client => client.identified && !client.isLocal);
        const totalClients = nonLocalClients.length;
        const readyCount = nonLocalClients.filter(client => client.isReady).length;
        const adminExists = [...state.clients.values()].some(client => client.identified && client.isLocal);

        logSocketMessage(`User connected: ${socket.id}`);

        socket.emit("initialState", {
            readyCount,
            totalClients,
            adminExists,
        });

        socket.on("clientIdentity", ({ windowName }) => {
            const client = state.clients.get(socket.id);
            if (!client) return;

            if (windowName && windowName.toLowerCase().includes("admin")) {
                client.isLocal = true;
                client.identified = true;
                logAdminMessage(`Local (admin) client identified by windowName: ${windowName}`);
            } else {
                client.isLocal = false;
                client.identified = true;
                logClientMessage(`Non-local client identified: ${windowName}`);
            }

            updateReadyStatus(io, state);
        });

        handleReadyEvents(io, socket, state);
        handleFeedbackEvents(io, socket, state); // specifically for the analytics

        socket.on("disconnect", () => {
            state.clients.delete(socket.id);
            updateReadyStatus(io, state);
            logSocketMessage(`User disconnected: ${socket.id}`);
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

function handleFeedbackEvents(io, socket, state) {
    socket.on("clientFeedbackUpdate", (data) => {
        for (const [clientSocketId, clientInfo] of state.clients.entries()) { // find admins
            if (clientInfo.isLocal) {
                io.to(clientSocketId).emit("updateClientFeedback", data);
            }
        }
    });
}

function updateReadyStatus(io, state) {
    const nonLocalClients = [...state.clients.values()].filter(client => !client.isLocal);
    const totalClients = nonLocalClients.length;
    const readyCount = nonLocalClients.filter(client => client.isReady).length;

    io.emit("updateReadyStatus", { readyCount, totalClients });

    if (totalClients > 0 && readyCount === totalClients) {
        logServerMessage("All clients are ready!");
        io.emit("allReady"); // server no longer tells clients which page to go to
    }
}

function setupMIDIProcessing(io) {
    const MIDIOutput = new easymidi.Output("Web MIDI Bridge", true);
    logMIDIMessage(`Output initialised: ${MIDIOutput.name}`);

    io.on("connection", (socket) => { // listening for midi data
        socket.on("sendMIDIData", (data) => {
            MIDIOutput.send("cc", { controller: 1, value: data.label1.proximity, channel: data.label1.index - 1 });
            MIDIOutput.send("cc", { controller: 2, value: data.label2.proximity, channel: data.label2.index - 1 });

            logMIDIMessage(`Received value 1: Index: ${data.label1.index}, Value: ${data.label1.proximity}`);
            logMIDIMessage(`Received value 2: Index: ${data.label2.index}, Value: ${data.label2.proximity}`);
        });

        socket.on("resetMIDI", () => {
            for (let channel = 0; channel <= 15; channel++) {
                MIDIOutput.send("cc", { controller: 0, value: 0, channel });
            }
            
            logMIDIMessage("Resetting all channels");
        });
    });
}

function startServer(server, port) {
    server.listen(port, () => {
        logServerMessage(`Chat running at http://localhost:${port}`);
    });
}

app.use(express.static(baseDirectory));
setupSocketEvents(io);
setupMIDIProcessing(io);
startServer(server, PORT);
