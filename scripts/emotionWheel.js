const mainCircle = document.getElementById("mainCircle");
const feedbackContainer = document.getElementById("feedbackContainer");

const oneLabelThreshold = 0.97;
const scaleRange = 2;

let hasClicked = false; 

const labels = [
    "Anger",
    "Conflict",
    "Dislike",
    "Guilt",
    "Sadness",
    "Loneliness",
    "Fear",
    "Shame",
];

const circleCentre = "50%";
const evenLabelY = "8%";
const evenLabelX = "40%";
const sideLabelX = "55%";
const middleLabelX = "50%";
const middleLabelY = "-8%";

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
    labels.forEach((text, labelPosition) => {
        const label = document.createElement("div");
        label.classList.add("emotion-label");
        label.textContent = text;

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

    if (closest.proximity / 100 >= oneLabelThreshold) { // one emotion threshold at 97% proximity
        return [closest, closest]; // temporary
    } else {
        return [closest, secondClosest];
    }
}

function showFeedback(topProximities) {
    const feedbackText = topProximities
        .map(proximity => `${labels[proximity.index - 1]}: ${proximity.proximity}%`) // the mapping happens here
        .join(topProximities.length === 1 ? "" : " and ");
    return feedbackText;
}

function floatToMIDI(value) {
    const clamped = Math.max(-scaleRange, Math.min(scaleRange, value)); // keep within range
    const scaled = Math.round(((clamped + scaleRange) / scaleRange) * 127); // map -2..2 to 0..127
    return scaled;
}

function handleCircleClick(event, socket) {
    if (hasClicked) return; // no data sent

    const { clickX, clickY, normalisedX, normalisedY } = getClickCoordinates(event);
    const coordsText = `Perspective score: ${normalisedX.toFixed(2)}, Arousal score: ${normalisedY.toFixed(2)}`;

    showUserSelection(clickX, clickY);

    const topProximities = findTopLabelProximities(normalisedX, normalisedY);
    const feedbackText = showFeedback(topProximities);

    socket.emit("clientFeedbackUpdate", { coordsText, feedbackText }); // always update admin

    lastSelection = { normalisedX, normalisedY, topProximities }; // storing the data but not emitting it just yet...
    nextPageButton.disabled = false;
    nextPageButton.textContent = "Next";
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

function emitMIDIData(socket, normalisedX, normalisedY, topProximities) {
    socket.emit("sendMIDIData", {
        arousalScore: floatToMIDI(normalisedY.toFixed(2)),
        perspectiveScore: floatToMIDI(normalisedX.toFixed(2)),
        label1: {
            index: topProximities[0].index,
            proximity: topProximities[0].proximity
        },
        label2: {
            index: topProximities[1].index,
            proximity: topProximities[1].proximity
        }
    });
}

export function enableMIDIEmission(socket) {
    if (hasClicked && lastSelection) {
        const { normalisedX, normalisedY, topProximities } = lastSelection;
        emitMIDIData(socket, normalisedX, normalisedY, topProximities);
    }
}

export function interactWithEmotionWheel(socket) { // this is the export
    mainCircle.addEventListener("click", (event) => handleCircleClick(event, socket));
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Labels drawn");
    drawLabels();
});