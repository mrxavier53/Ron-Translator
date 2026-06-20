const RON_RUNE_MAP = {
    a: "ᚨ", b: "ᛒ", c: "ᚲ", d: "ᛞ", e: "ᛖ",
    f: "ᚠ", g: "ᚷ", h: "ᚺ", i: "ᛁ", j: "ᛃ",
    k: "ᚲ", l: "ᛚ", m: "ᛗ", n: "ᚾ", o: "ᛟ",
    p: "ᛈ", q: "ᚲ", r: "ᚱ", s: "ᛋ", t: "ᛏ",
    u: "ᚢ", v: "ᚠ", w: "ᚹ", x: "ᛋ", y: "ᛃ",
    z: "ᛉ", " ": " "
};

const REVERSE_RUNE_MAP = {
    "ᚨ": "a", "ᛒ": "b", "ᚲ": "c", "ᛞ": "d", "ᛖ": "e",
    "ᚠ": "f", "ᚷ": "g", "ᚺ": "h", "ᛁ": "i", "ᛃ": "j",
    "ᛚ": "l", "ᛗ": "m", "ᚾ": "n", "ᛟ": "o", "ᛈ": "p",
    "ᚱ": "r", "ᛋ": "s", "ᛏ": "t", "ᚢ": "u", "ᚹ": "w",
    "ᛉ": "z", " ": " "
};

const inputArea = document.getElementById("english-input");
const outputDiv = document.getElementById("ron-output");
const copyBtnEng = document.getElementById("copy-btn-eng");
const charCountEng = document.getElementById("eng-char-count");

const ronInputArea = document.getElementById("ron-input");
const englishOutputDiv = document.getElementById("english-output");
const copyBtnRon = document.getElementById("copy-btn-ron");
const charCountRon = document.getElementById("ron-char-count");

const loadingScreen = document.getElementById("loading-screen");
const engToRonBtn = document.getElementById("eng-to-ron-btn");
const ronToEngBtn = document.getElementById("ron-to-eng-btn");
const engToRonArea = document.getElementById("eng-to-ron-area");
const ronToEngArea = document.getElementById("ron-to-eng-area");

let currentMode = "eng-to-ron";
let translationHistory = JSON.parse(localStorage.getItem("ronHistory") || "[]");

let audioContext = null;
let runeSoundsEnabled = localStorage.getItem("ronRuneSounds") !== "off";

let typingTimer;
let ronTypingTimer;
let lastTypingSoundTime = 0;
let lastRuneSoundTime = 0;

/* ─────────────────────────────────────────────
   TRANSLATION FUNCTIONS
───────────────────────────────────────────── */

function translateToRon(text) {
    return text
        .toLowerCase()
        .split("")
        .map((char) => RON_RUNE_MAP[char] || char)
        .join("");
}

function translateToEnglish(text) {
    return text
        .split("")
        .map((char) => REVERSE_RUNE_MAP[char] || char)
        .join("");
}

/* ─────────────────────────────────────────────
   RON SOUND SYSTEM
   No MP3 files needed.
───────────────────────────────────────────── */

function initAudio() {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }
}

function makeTone({
    frequency = 600,
    duration = 0.08,
    volume = 0.08,
    type = "sine",
    slideTo = null
} = {}) {
    if (!runeSoundsEnabled) return;

    initAudio();

    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    if (slideTo !== null) {
        oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(slideTo, 1),
            now + duration
        );
    }

    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(
        0.00001,
        now + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
}

/* Soft sound while user types in either text box */
function playTypingSound() {
    if (!runeSoundsEnabled) return;

    const now = Date.now();

    // Prevents hundreds of sounds during fast typing.
    if (now - lastTypingSoundTime < 65) return;
    lastTypingSoundTime = now;

    makeTone({
        frequency: 260 + Math.random() * 80,
        duration: 0.035,
        volume: 0.025,
        type: "triangle",
        slideTo: 210
    });
}

/* Magical click while translated letters/runes appear */
function playStoneClick() {
    if (!runeSoundsEnabled) return;

    const now = Date.now();

    // Keeps long translations from becoming noisy.
    if (now - lastRuneSoundTime < 45) return;
    lastRuneSoundTime = now;

    makeTone({
        frequency: 600 + Math.random() * 200,
        duration: 0.08,
        volume: 0.08,
        type: "sine",
        slideTo: 460
    });
}

/* Final magical sound after translation is fully shown */
function playTranslationCompleteSound() {
    if (!runeSoundsEnabled) return;

    makeTone({
        frequency: 520,
        duration: 0.16,
        volume: 0.07,
        type: "sine",
        slideTo: 740
    });

    setTimeout(() => {
        makeTone({
            frequency: 780,
            duration: 0.22,
            volume: 0.06,
            type: "sine",
            slideTo: 980
        });
    }, 90);
}

/* Shows text slowly with rune sounds */
function typewriterEffect(element, text) {
    if (element._ronTypingTimer) {
        clearTimeout(element._ronTypingTimer);
    }

    element.textContent = "";
    let i = 0;

    function addChar() {
        if (i >= text.length) {
            playTranslationCompleteSound();
            return;
        }

        const character = text.charAt(i);
        element.textContent += character;

        if (character.trim() !== "") {
            playStoneClick();
        }

        i += 1;

        element._ronTypingTimer = setTimeout(addChar, 18);
    }

    addChar();
}

/* Plays typing sound only when user adds text, not deletes it */
function handleInputTypingSound(event) {
    const deleteActions = [
        "deleteContentBackward",
        "deleteContentForward",
        "deleteByCut",
        "deleteByDrag"
    ];

    if (deleteActions.includes(event.inputType)) return;
    if (event.isComposing) return;

    playTypingSound();
}

/* ─────────────────────────────────────────────
   HISTORY
───────────────────────────────────────────── */

function saveToHistory(input, output, mode) {
    if (!input.trim() || !output.trim()) return;

    const newest = translationHistory[0];

    if (
        newest &&
        newest.input === input.substring(0, 80) &&
        newest.output === output.substring(0, 80)
    ) {
        return;
    }

    translationHistory.unshift({
        id: Date.now(),
        input: input.substring(0, 80),
        output: output.substring(0, 80),
        mode,
        date: new Date().toLocaleTimeString()
    });

    if (translationHistory.length > 10) {
        translationHistory.pop();
    }

    localStorage.setItem("ronHistory", JSON.stringify(translationHistory));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById("history-list");

    if (!historyList) return;

    if (translationHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No translations yet</div>';
        return;
    }

    historyList.innerHTML = translationHistory
        .map(
            (item) => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-text">${escapeHtml(item.input)}</div>
                <div class="history-text" style="color: #00e5ff; font-size: 0.8em;">
                    → ${escapeHtml(item.output)}
                </div>
                <div class="history-date">
                    ${item.mode === "eng-to-ron" ? "📖→ᚱ" : "ᚱ→📖"} | ${item.date}
                </div>
            </div>
        `
        )
        .join("");

    document.querySelectorAll(".history-item").forEach((element) => {
        element.addEventListener("click", () => {
            const id = Number(element.dataset.id);
            const item = translationHistory.find((history) => history.id === id);

            if (!item) return;

            if (item.mode === "eng-to-ron") {
                engToRonBtn.click();
                inputArea.value = item.input;
                charCountEng.textContent = `${item.input.length} characters`;
                triggerTranslation();
            } else {
                ronToEngBtn.click();
                ronInputArea.value = item.input;
                charCountRon.textContent = `${item.input.length} characters`;
                triggerReverseTranslation();
            }

            document.getElementById("history-sidebar").classList.remove("open");
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function clearHistory() {
    document.querySelectorAll(".history-item").forEach((item) => {
        item.classList.add("fade-out");
    });

    setTimeout(() => {
        translationHistory = [];
        localStorage.setItem("ronHistory", "[]");
        renderHistory();
    }, 300);
}

/* ─────────────────────────────────────────────
   TRANSLATION ACTIONS
───────────────────────────────────────────── */

function triggerTranslation() {
    const text = inputArea.value;

    if (text.trim() === "") {
        outputDiv.textContent = "...";
        return;
    }

    const translated = translateToRon(text);

    typewriterEffect(outputDiv, translated);
    saveToHistory(text, translated, "eng-to-ron");
}

function triggerReverseTranslation() {
    const text = ronInputArea.value;

    if (text.trim() === "") {
        englishOutputDiv.textContent = "...";
        return;
    }

    const translated = translateToEnglish(text);

    typewriterEffect(englishOutputDiv, translated);
    saveToHistory(text, translated, "ron-to-eng");
}

/* ─────────────────────────────────────────────
   FILE UPLOAD
───────────────────────────────────────────── */

async function translateFile(file, mode) {
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
        alert("Please choose a .txt file");
        return;
    }

    const text = await file.text();

    if (mode === "eng-to-ron") {
        inputArea.value = text;
        charCountEng.textContent = `${text.length} characters`;
        triggerTranslation();
    } else {
        ronInputArea.value = text;
        charCountRon.textContent = `${text.length} characters`;
        triggerReverseTranslation();
    }
}

function setupDragAndDrop(zoneId, inputId, mode) {
    const zone = document.getElementById(zoneId);
    const fileInput = document.getElementById(inputId);

    if (!zone || !fileInput) return;

    const button = zone.querySelector(".file-btn");

    if (button) {
        button.addEventListener("click", () => fileInput.click());
    }

    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];

        if (file) {
            await translateFile(file, mode);
        }
    });

    zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", () => {
        zone.classList.remove("drag-over");
    });

    zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        zone.classList.remove("drag-over");

        const file = event.dataTransfer.files[0];

        if (file) {
            await translateFile(file, mode);
        }
    });
}

/* ─────────────────────────────────────────────
   COPY + DOWNLOAD
───────────────────────────────────────────── */

function downloadTranslation() {
    let content;
    let filename;

    if (currentMode === "eng-to-ron") {
        content = outputDiv.textContent;
        filename = "ron_translation.txt";
    } else {
        content = englishOutputDiv.textContent;
        filename = "english_translation.txt";
    }

    if (!content || content === "...") return;

    const blob = new Blob([content], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function showCopiedState(button) {
    const copyText = button.querySelector(".copy-text");
    const copyIcon = button.querySelector(".copy-icon");

    copyIcon.textContent = "✓";
    copyText.textContent = "Copied!";
    button.classList.add("copied");

    setTimeout(() => {
        copyIcon.textContent = "📋";
        copyText.textContent = "Copy";
        button.classList.remove("copied");
    }, 2000);
}

async function copyText(text, button) {
    if (!text || text === "...") return;

    try {
        await navigator.clipboard.writeText(text);
        showCopiedState(button);
    } catch (error) {
        const textarea = document.createElement("textarea");

        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();

        document.execCommand("copy");
        document.body.removeChild(textarea);

        showCopiedState(button);
    }
}

/* ─────────────────────────────────────────────
   PARTICLES
───────────────────────────────────────────── */

function createParticles() {
    const particlesContainer = document.getElementById("particles");

    const runes = [
        "ᚱ", "ᛟ", "ᚾ", "ᚨ", "ᛒ",
        "ᚲ", "ᛞ", "ᛖ", "ᚠ"
    ];

    if (!particlesContainer) return;

    for (let i = 0; i < 30; i += 1) {
        const particle = document.createElement("div");

        particle.classList.add("particle");
        particle.textContent = runes[Math.floor(Math.random() * runes.length)];

        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.animationDuration = `${Math.random() * 10 + 10}s`;

        particlesContainer.appendChild(particle);
    }
}

/* ─────────────────────────────────────────────
   EVENTS
───────────────────────────────────────────── */

function setupEvents() {
    const historyToggle = document.getElementById("history-toggle");
    const historySidebar = document.getElementById("history-sidebar");
    const clearHistoryBtn = document.getElementById("clear-history");

    const downloadBtnEng = document.getElementById("download-btn-eng");
    const downloadBtnRon = document.getElementById("download-btn-ron");

    if (historyToggle && historySidebar) {
        historyToggle.addEventListener("click", () => {
            historySidebar.classList.toggle("open");
        });

        document.addEventListener("click", (event) => {
            if (
                !historySidebar.contains(event.target) &&
                event.target !== historyToggle
            ) {
                historySidebar.classList.remove("open");
            }
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", clearHistory);
    }

    if (downloadBtnEng) {
        downloadBtnEng.addEventListener("click", downloadTranslation);
    }

    if (downloadBtnRon) {
        downloadBtnRon.addEventListener("click", downloadTranslation);
    }

    setupDragAndDrop("drop-zone-eng", "file-input-eng", "eng-to-ron");
    setupDragAndDrop("drop-zone-ron", "file-input-ron", "ron-to-eng");

    engToRonBtn.addEventListener("click", () => {
        currentMode = "eng-to-ron";

        engToRonBtn.classList.add("active");
        ronToEngBtn.classList.remove("active");

        engToRonArea.classList.remove("hidden");
        ronToEngArea.classList.add("hidden");
    });

    ronToEngBtn.addEventListener("click", () => {
        currentMode = "ron-to-eng";

        ronToEngBtn.classList.remove("active");
        engToRonBtn.classList.remove("active");
        ronToEngBtn.classList.add("active");

        ronToEngArea.classList.remove("hidden");
        engToRonArea.classList.add("hidden");
    });

    inputArea.addEventListener("input", (event) => {
        handleInputTypingSound(event);

        const text = inputArea.value;
        charCountEng.textContent = `${text.length} characters`;

        clearTimeout(typingTimer);
        typingTimer = setTimeout(triggerTranslation, 300);
    });

    ronInputArea.addEventListener("input", (event) => {
        handleInputTypingSound(event);

        const text = ronInputArea.value;
        charCountRon.textContent = `${text.length} characters`;

        clearTimeout(ronTypingTimer);
        ronTypingTimer = setTimeout(triggerReverseTranslation, 300);
    });

    copyBtnEng.addEventListener("click", () => {
        copyText(outputDiv.textContent, copyBtnEng);
    });

    copyBtnRon.addEventListener("click", () => {
        copyText(englishOutputDiv.textContent, copyBtnRon);
    });

    // Unlocks audio after the user's first real touch or keypress.
    document.addEventListener("pointerdown", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });
}

/* ─────────────────────────────────────────────
   PWA
───────────────────────────────────────────── */

function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js").catch((error) => {
            console.warn("Service worker registration failed:", error);
        });
    }
}

/* ─────────────────────────────────────────────
   START APP
───────────────────────────────────────────── */

window.addEventListener("load", () => {
    setTimeout(() => {
        loadingScreen.style.opacity = "0";

        setTimeout(() => {
            loadingScreen.style.display = "none";
        }, 500);
    }, 900);

    createParticles();
    setupEvents();
    renderHistory();
    registerServiceWorker();
});
