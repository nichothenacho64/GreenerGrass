import chalk from "chalk";

const messageTypes = {
    socket: { label: "[SOCKET.IO]", colour: "#55ff88ff" }, // 55abfbff
    midi: { label: "[MIDI]", colour: "#a987ffff" },
    admin: { label: "[ADMIN]", colour: "#5496ffff" },
    client: { label: "[CLIENT]", colour: "#73d0ffff" },
    server: { label: "[SERVER]", colour: "#ff5177ff" },
};

function logMessage(type, message) {
    const { label, colour } = type;
    console.log(chalk.hex(colour)(label), chalk.hex(colour)(message));
}

export function logAdminMessage(message) {
    logMessage(messageTypes.admin, message);
}

export function logClientMessage(message) {
    logMessage(messageTypes.client, message);
}

export function logMIDIMessage(message) {
    logMessage(messageTypes.midi, message);
}

export function logServerMessage(message) {
    logMessage(messageTypes.server, message);
}

export function logSocketMessage(message) {
    logMessage(messageTypes.socket, message); 
}