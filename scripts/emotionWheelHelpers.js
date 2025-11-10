const sdf = 65; // for the sake of consistency with SCSS, these constants have the same names as their SCSS conterparts
const ldf = 55;

const smtp1 = 6;
const smtp2 = smtp1 * 2;

const lmtp1 = 12;
const lmtp2 = lmtp1 * 2;

const emotionColours = [
    `hsl(80, ${sdf + smtp2}%, ${ldf}%)`,
    `hsl(125, ${sdf + smtp1}%, ${ldf + lmtp1}%)`,
    `hsl(170, ${sdf}%, ${ldf + lmtp2}%)`,
    `hsl(215, ${sdf - smtp1}%, ${ldf + lmtp1}%)`,
    `hsl(260, ${sdf - smtp2}%, ${ldf}%)`,
    `hsl(305, ${sdf - smtp1}%, ${ldf - lmtp1}%)`,
    `hsl(350, ${sdf}%, ${ldf - lmtp2}%)`,
    `hsl(35, ${sdf + smtp1}%, ${ldf - lmtp2}%)`
];

const highContrastLabels = [
    "Tension",
    "Sadness",
    "Curiosity",
    "Calm",
    "Anger",
    "Fear",
    "Wonder",
    "Guilt"
];

export function applyEmotionColours(currentLabels) {
    currentLabels.forEach((labelObj, i) => {
        document.documentElement.style.setProperty(`--emotion-${i + 1}`, emotionColours[labelObj.index - 1]);
    });
}

function getRandomisedLabels(originalLabels) {
    const indexedLabels = originalLabels.map((text, index) => ({ text, index: index + 1 }));
    for (let i = indexedLabels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexedLabels[i], indexedLabels[j]] = [indexedLabels[j], indexedLabels[i]];
    }
    return indexedLabels;
}

export function getOriginalLabelIndex(visualIndex, currentLabels) {
    const originalIndex = currentLabels[visualIndex - 1];
    return originalIndex ? originalIndex.index : visualIndex; // fall back to visualIndex if something odd
}

export function getWheelChoice(labels) {
    let currentLabels;

    const storedWheel = sessionStorage.getItem("chosenWheel") || "default";

    if (storedWheel === "highContrast") {
        currentLabels = highContrastLabels.map(text => ({
            text,
            index: labels.indexOf(text) + 1
        }));
    } else if (storedWheel === "random") {
        currentLabels = getRandomisedLabels(labels);
    } else {
        currentLabels = labels.map((text, i) => ({ text, index: i + 1 }));
    }

    return currentLabels;
}