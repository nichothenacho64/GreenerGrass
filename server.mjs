import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import easymidi from "easymidi";

const PORT = 3000;
const __filename = fileURLToPath(import.meta.url)
const baseDirectory = path.dirname(__filename)

const app = express();
const server = http.createServer(app);
const io = new Server(server); // the server manager for all

function setupSocketEvents(io) {
    const state = {
        clients: new Map(),
    };

    io.on("connection", (socket) => {
        state.clients.set(socket.id, { isLocal: false, isReady: false, identified: false });

        console.log(`[SOCKET.IO] User connected: ${socket.id}`);

        socket.on("clientIdentity", ({ isLocal }) => {
            const client = state.clients.get(socket.id);
            if (client) {
                client.isLocal = !!isLocal;

                if (client.isLocal) {
                    console.log(`[ADMIN] Localhost client ${socket.id} ignored from totals`);
                    updateReadyStatus(io, state); // an additional measure for removal
                    return;
                }
            }
            updateReadyStatus(io, state);
        });

        handleReadyEvents(io, socket, state);

        socket.on("disconnect", () => {
            state.clients.delete(socket.id);
            updateReadyStatus(io, state);
            console.log(`[SOCKET.IO] User disconnected: ${socket.id}`);
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
    const nonLocalClients = [...state.clients.values()].filter(client => !client.isLocal);
    const totalClients = nonLocalClients.length;
    const readyCount = nonLocalClients.filter(client => client.isReady).length;

    io.emit("updateReadyStatus", { readyCount, totalClients });

    if (totalClients > 0 && readyCount === totalClients) {
        console.log("[SERVER] All clients are ready!"); // debugging
        io.emit("allReady"); // change page
    }
}

function setupMIDIProcessing(io) {
    const MIDIOutput = new easymidi.Output("Web MIDI Bridge", true);
    console.log("[MIDI] Output initialised:", MIDIOutput.name);

    io.on("connection", (socket) => { // listening for midi data
        socket.on("sendMIDIData", (data) => {
            MIDIOutput.send("cc", { controller: 10, value: data.perspectiveScore, channel: 10 }); // ! the channels may need to differ
            MIDIOutput.send("cc", { controller: 10, value: data.arousalScore, channel: 11 });
            MIDIOutput.send("cc", { controller: 1, value: data.label1.proximity, channel: data.label1.index - 1 });
            MIDIOutput.send("cc", { controller: 2, value: data.label2.proximity, channel: data.label2.index - 1 });

            console.log(`[MIDI] Received value 1: Index: ${data.label1.index}, Value: ${data.label1.proximity}`);
            console.log(`[MIDI] Received value 2: Index: ${data.label2.index}, Value: ${data.label2.proximity}`);
        });

        socket.on("resetMIDI", () => {
            console.log("[MIDI] Resetting all channels");
            for (let channel = 0; channel <= 15; channel++) {
                MIDIOutput.send("cc", { controller: 0, value: 0, channel });
            }
        });
    });
}

function startServer(server, port) {
    server.listen(port, () => {
        console.log(`[SERVER] Chat running at http://localhost:${port}`);
    });
}

app.use(express.static(baseDirectory));
setupSocketEvents(io);
setupMIDIProcessing(io);
startServer(server, PORT);

/* 
NOTE:
The 'admin' should be immediately directed to the admin page
All other clients should start on the user page
*/