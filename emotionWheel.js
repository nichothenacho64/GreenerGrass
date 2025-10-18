const mainCircle = document.getElementById('mainCircle');
const coordsDisplay = document.getElementById('coords');

function createDot(x, y) {
    const dot = document.createElement('div');
    dot.classList.add('small-circle');
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    mainCircle.appendChild(dot);
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
