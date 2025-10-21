const mainCircle = document.getElementById('mainCircle');
const coordsDisplay = document.getElementById('coords');
const scene = document.getElementById('scene');

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

function createDot(x, y) {
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
        label.classList.add('label');
        label.textContent = text;
        Object.assign(label.style, labelPositions[labelPosition]);
        scene.appendChild(label);
        requestAnimationFrame(() => {
            label.style.opacity = '1';
        });
    });
}

mainCircle.addEventListener('click', (event) => {
    const rect = mainCircle.getBoundingClientRect(); // the main circle's position RELATIVE to the viewport
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = event.clientX - rect.left; // the click position relative to the circle
    const y = event.clientY - rect.top; // ! check compatibility with iOS!

    const normX = ((x - centerX) / centerX) * 2; // converting to my coordinate system
    const normY = -((y - centerY) / centerY) * 2; // invert Y so that the top is +2

    coordsDisplay.textContent = `x: ${normX.toFixed(2)}, y: ${normY.toFixed(2)}`;
    createDot(x, y);
});

drawLabels();
