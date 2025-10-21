const mainCircle = document.getElementById('mainCircle');
const coordsDisplay = document.getElementById('coords');
const scene = document.getElementById('scene');
const feedback = document.getElementById('feedback'); 

const evenLabelX = '-2.5%';
const evenLabelY = '10%';
const middleLabelX = '50%';
const middleLabelY = '-8%';
const sideLabelX = '-15%';
const sideLabelY = '50%';

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

const oneLabelThreshold = 0.97;

const labelPositions = [
    { top: middleLabelY, left: middleLabelX, transform: 'translateX(-50%)' },
    { top: evenLabelY, right: evenLabelX },
    { top: sideLabelY, right: sideLabelX, transform: 'translateY(-50%)' },
    { bottom: evenLabelY, right: evenLabelX },
    { bottom: middleLabelY, left: middleLabelX, transform: 'translateX(-50%)' },
    { bottom: evenLabelY, left: evenLabelX },
    { top: sideLabelY, left: sideLabelX, transform: 'translateY(-50%)' },
    { top: evenLabelY, left: evenLabelX }
];

function generateVertexCoordinates() {
    const vertexCoords = [];
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i; // making 0 the top
        const x = 2 * Math.sin(angle); 
        const y = 2 * Math.cos(angle);
        vertexCoords.push({ label: labels[i], x, y });
    }
    return vertexCoords;
}

function showUserSelection(x, y) {
    const existingDot = mainCircle.querySelector('.user-selection');
    if (existingDot) {
        existingDot.remove();
    }

    const dot = document.createElement('div');
    dot.classList.add('user-selection');
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    mainCircle.appendChild(dot);

    requestAnimationFrame(() => {
        dot.classList.add('visible');
    });
}

function drawLabels() {
    labels.forEach((text, labelPosition) => {
        const label = document.createElement('div');
        label.classList.add('emotion-label');
        label.textContent = text;
        Object.assign(label.style, labelPositions[labelPosition]);
        scene.appendChild(label);
        requestAnimationFrame(() => {
            label.style.opacity = '1';
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
            label: vertex.label, 
            proximity: Math.round(proximityRatio * 100) 
        };
    });

    proximities.sort((a, b) => b.proximity - a.proximity);

    const closest = proximities[0];
    const secondClosest = proximities[1];

    if (closest.proximity / 100 > oneLabelThreshold) { // one emotion threshold at 85% proximity
        return [ { label: closest.label, proximity: 100 } ];
    } else {
        return [closest, secondClosest];
    }
}

function showFeedback(topProximities) {
    const feedbackText = topProximities
        .map(proximity => `${proximity.label}: ${proximity.proximity}%`)
        .join(topProximities.length === 1 ? '' : ' and ');
    feedback.textContent = feedbackText;
}

mainCircle.addEventListener('click', (event) => {
    const boundingRect = mainCircle.getBoundingClientRect(); // the main circle's position RELATIVE to the viewport
    const centerX = boundingRect.width / 2;
    const centerY = boundingRect.height / 2;

    const clickX = event.clientX - boundingRect.left; // the click position relative to the circle
    const clickY = event.clientY - boundingRect.top; // ! check compatibility with iOS!

    const normalisedX = ((clickX - centerX) / centerX) * 2; // converting to my coordinate system
    const normalisedY = -((clickY - centerY) / centerY) * 2; // invert Y so that the top is +2

    coordsDisplay.textContent = `x: ${normalisedX.toFixed(2)}, y: ${normalisedY.toFixed(2)}`;
    showUserSelection(clickX, clickY);

    const topProximities = findTopLabelProximities(normalisedX, normalisedY);
    console.log(topProximities);
    showFeedback(topProximities);

    // send the proximity values to Max
    // topProximities[0].proximity...
});

drawLabels();
