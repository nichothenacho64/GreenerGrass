const emotionColours = [ // this will do for now
    "hsl(270, 60%, 55%)",
    "hsl(250, 66%, 66%)",
    "hsl(230, 60%, 67%)",
    "hsl(210, 54%, 66%)",
    "hsl(190, 48%, 55%)",
    "hsl(170, 54%, 44%)",
    "hsl(150, 60%, 33%)",
    "hsl(130, 66%, 33%)",
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

    if (storedWheel === "alphabetical") {
        currentLabels = [...labels]
            .sort()
            .map(text => ({ text, index: labels.indexOf(text) + 1 }));
    } else if (storedWheel === "random") {
        currentLabels = getRandomisedLabels(labels);
    } else {
        currentLabels = labels.map((text, i) => ({ text, index: i + 1 }));
    }

    return currentLabels;
}