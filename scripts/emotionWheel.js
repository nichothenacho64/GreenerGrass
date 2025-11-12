import {
    applyEmotionColours,
    getWheelChoice,
    getOriginalLabelIndex
} from "./emotionWheelHelpers.js";

const nextPageButtons = document.querySelectorAll(".next-page-button");
const mainCircle = document.getElementById("mainCircle");
const feedbackContainer = document.getElementById("feedbackContainer");

const instructionLabel = document.getElementById("instructionLabel");
const midiButton = document.getElementById("midiButton");

const scaleRange = 2;
const instructionMessageFadeoutTime = 500;
const dotFadeOutTime = 400;

const labels = [
    "Tension",
    "Curiosity",
    "Calm",
    "Wonder",
    "Sadness",
    "Fear",
    "Anger",
    "Guilt",
];

const circleCentre = "50%";
const evenLabelY = "8%";
const evenLabelX = "40%";
const sideLabelX = "55%";
const middleLabelX = "50%";
const middleLabelY = "-10%";

const labelPositions = [
    { top: middleLabelY, left: middleLabelX, transform: "translateX(-50%)" },
    { top: evenLabelY, left: `calc(${circleCentre} + ${evenLabelX})`, textAlign: "left" },
    { top: circleCentre, left: `calc(${circleCentre} + ${sideLabelX})`, transform: "translateY(-50%)", textAlign: "left" },
    { bottom: evenLabelY, left: `calc(${circleCentre} + ${evenLabelX})`, textAlign: "left" },
    { bottom: middleLabelY, left: middleLabelX, transform: "translateX(-50%)" },
    { bottom: evenLabelY, right: `calc(${circleCentre} + ${evenLabelX})`, textAlign: "right" },
    { top: circleCentre, right: `calc(${circleCentre} + ${sideLabelX})`, transform: "translateY(-50%)", textAlign: "right" },
    { top: evenLabelY, right: `calc(${circleCentre} + ${evenLabelX})`, textAlign: "right" }
];

let lastSelection = null;
let nextButtonClicked = false;

const currentLabels = getWheelChoice(labels);

function generateVertexCoordinates() {
    const vertexCoords = [];
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i; // making 0 the top
        const x = 2 * Math.sin(angle);
        const y = 2 * Math.cos(angle);
        vertexCoords.push({ index: i, x, y });
    }
    return vertexCoords;
}

function showUserSelection(x, y) {
    const existingDot = mainCircle.querySelector(".user-selection");
    if (existingDot) {
        existingDot.remove();
    }

    const dot = document.createElement("div");
    dot.classList.add("user-selection");
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    mainCircle.appendChild(dot);

    requestAnimationFrame(() => {
        dot.classList.add("visible");
    });
}

function drawLabels() {
    currentLabels.forEach((labelObj, labelPosition) => {
        const label = document.createElement("div");
        label.classList.add("emotion-label");
        label.textContent = labelObj.text;

        Object.assign(label.style, labelPositions[labelPosition]);
        if (labelPositions[labelPosition].textAlign) {
            label.style.textAlign = labelPositions[labelPosition].textAlign;
        }

        feedbackContainer.appendChild(label);
        requestAnimationFrame(() => {
            label.style.opacity = "1";
        });
    });
}

function findTopLabelProximities(normalisedX, normalisedY) {
    const vertexCoords = generateVertexCoordinates();
    const proximities = vertexCoords.map(vertex => {
        const clickProjection = normalisedX * vertex.x + normalisedY * vertex.y;
        const vertexLen2 = vertex.x * vertex.x + vertex.y * vertex.y;
        let proximityRatio = clickProjection / vertexLen2;           // projection ratio along vertex direction
        proximityRatio = Math.min(Math.max(proximityRatio, 0), 1); // clamp 0–1
        return {
            index: vertex.index + 1,
            proximity: Math.round(proximityRatio * 100)
        };
    });

    proximities.sort((a, b) => b.proximity - a.proximity);

    const closest = proximities[0];
    const secondClosest = proximities[1];

    return [closest, secondClosest];
}

function showFeedback(topProximities) {
    const feedbackText = topProximities
        .map(proximity => {
            const matchingLabel = labels[proximity.index - 1];
            return `${matchingLabel}: ${proximity.proximity}%`;
        })
        .join(topProximities.length === 1 ? "" : " and ");
    return feedbackText;
}

function handleCircleClick(event, socket) {
    if (nextButtonClicked) return;

    const { clickX, clickY, normalisedX, normalisedY } = getClickCoordinates(event);
    const coordsText = `Valence score: ${normalisedX.toFixed(2)}, Arousal score: ${normalisedY.toFixed(2)}`;

    showUserSelection(clickX, clickY);

    const topProximities = findTopLabelProximities(normalisedX, normalisedY);
    const feedbackText = showFeedback(topProximities);

    socket.emit("clientFeedbackUpdate", { coordsText, feedbackText }); // always update admin

    lastSelection = { normalisedX, normalisedY, topProximities }; // storing the data but not emitting it just yet...

    if (midiButton) {
        midiButton.disabled = false;
    }
}

function getClickCoordinates(event) {
    const boundingRect = mainCircle.getBoundingClientRect(); // the main circle's position RELATIVE to the viewport
    const centerX = boundingRect.width / 2;
    const centerY = boundingRect.height / 2;

    const clickX = event.clientX - boundingRect.left; // the click position relative to the circle
    const clickY = event.clientY - boundingRect.top;  // ! check compatibility with iOS!

    const normalisedX = ((clickX - centerX) / centerX) * scaleRange; // normalising the click coordinates
    const normalisedY = -((clickY - centerY) / centerY) * scaleRange;

    return { clickX, clickY, normalisedX, normalisedY };
}

function flashEmotionWheel(topProximities) {
    mainCircle.classList.remove("flash");
    void mainCircle.offsetWidth;
    mainCircle.classList.add("flash");

    const emotionLabels = document.querySelectorAll(".emotion-label");

    topProximities.slice(0, 2).forEach(({ index }) => {
        const visualIndex = index - 1;
        const label = emotionLabels[visualIndex];
        if (label) {
            label.classList.remove("flash");
            void label.offsetWidth;
            label.classList.add("flash");
        }
    });
}

function emitMIDIData(socket, topProximities) {
    socket.emit("sendMIDIData", {
        label1: {
            index: getOriginalLabelIndex(topProximities[0].index, currentLabels),
            proximity: topProximities[0].proximity
        },
        label2: {
            index: getOriginalLabelIndex(topProximities[1].index, currentLabels),
            proximity: topProximities[1].proximity
        }
    });
}

export function enableMIDIEmission(socket) {
    if (lastSelection) {
        const { normalisedX, normalisedY, topProximities } = lastSelection;
        emitMIDIData(socket, topProximities);
        flashEmotionWheel(topProximities);
        console.log(`MIDI data emission values: ${normalisedX}, ${normalisedY}, ${topProximities}`);
    } else {
        console.log("MIDI emission is not enabled yet");
    }
}

export function interactWithEmotionWheel(socket) { // this is the export
    mainCircle.addEventListener("click", (event) => handleCircleClick(event, socket));
}

document.addEventListener("DOMContentLoaded", () => {
    drawLabels();
    applyEmotionColours(currentLabels);
    midiButton.disabled = true;

    midiButton.addEventListener("click", () => {
        midiButton.disabled = true;
        nextPageButtons.forEach(button => {
            button.disabled = false;
            button.textContent = "Next";
        });

        instructionLabel.style.opacity = "0";
        setTimeout(() => {
            instructionLabel.style.display = "none";
        }, instructionMessageFadeoutTime);

        const previousDot = mainCircle.querySelector(".user-selection");
        if (previousDot) {
            previousDot.style.transition = `opacity ${dotFadeOutTime / 1000}s ease`;
            previousDot.style.opacity = "0";
            setTimeout(() => previousDot.remove(), dotFadeOutTime);
        }
    });

    nextPageButtons.forEach(button => {
        button.addEventListener("click", () => {
            nextButtonClicked = true;
            midiButton.style.opacity = 0;
        });
    });
});