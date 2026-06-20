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

let englishTranslationTimer = null;
let ronTranslationTimer = null;

/* 20 milliseconds automatic translate delay */
const TRANSLATION_DELAY = 20;

/* 20 milliseconds between each rune appearing */
const RUNE_REVEAL_DELAY = 20;

/* ─────────────────────────────────────────────
   TRANSLATION
───────────────────────────────────────────── */

function translateToRon(text) {
    return text
        .toLowerCase()
        .split("")
        .map((character) => RON_RUNE_MAP[character] || character)
        .join("");
}

function translateToEnglish(text) {
    return text
        .split("")
        .map((character) => REVERSE_RUNE_MAP[character] || character)
        .join("");
}

/* ─────────────────────────────────────────────
   SOUND SYSTEM
   No MP3 or download needed.
───────────────────────────────────────────── */

function initAudio() {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }
}

function makeTone(frequency, duration, volume, type, slideTo) {
    initAudio();

    if (!audioContext) return;

    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    if (slideTo) {
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

/* Runs immediately on every typed character */
function playTypingSound(event) {
    if (!event) return;

    if (event.inputType && event.inputType.startsWith("delete")) {
        return;
    }

    if (event.isComposing) return;

    makeTone(
        280 + Math.random() * 55,
        0.028,
        0.025,
        "triangle",
        215
    );
}

/* Rune sound while translated letters appear */
function playStoneClick() {
    makeTone(
        600 + Math.random() * 200,
        0.075,
        0.07,
        "sine",
        460
    );
}

/* Sound after the complete translation is shown */
function playTranslationCompleteSound() {
    makeTone(520, 0.14, 0.06, "sine", 730);

    window.setTimeout(() => {
        makeTone(780, 0.20, 0.05, "sine", 970);
    }, 85);
}

/* ─────────────────────────────────────────────
   RUNE REVEAL EFFECT
───────────────────────────────────────────── */

function typewriterEffect(element, text) {
    if (element._ronTypingTimer) {
        clearTimeout(element._ronTypingTimer);
    }

    element.textContent = "";

    let index = 0;

    function revealNextCharacter() {
        if (index >= text.length) {
            playTranslationCompleteSound();
            return;
        }

        const character = text.charAt(index);

        element.textContent += character;

        if (character.trim()) {
            playStoneClick();
        }

        index += 1;

        element._ronTypingTimer = setTimeout(
            revealNextCharacter,
            RUNE_REVEAL_DELAY
        );
    }

    revealNextCharacter();
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

function escapeHtml(text) {
    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

function renderHistory() {
    const historyList = document.getElementById("history-list");

    if (!historyList) return;

    if (!translationHistory.length) {
        historyList.innerHTML = `
            <div class="empty-history">No translations yet</div>
        `;
        return;
    }

    historyList.innerHTML = translationHistory
        .map((item) => {
            return `
                <div class="history-item" data-id="${item.id}">
                    <div class="history-text">
                        ${escapeHtml(item.input)}
                    </div>

                    <div class="history-text" style="color: #00e5ff; font-size: 0.8em;">
                        → ${escapeHtml(item.output)}
                    </div>

                    <div class="history-date">
                        ${item.mode === "eng-to-ron" ? "📖→ᚱ" : "ᚱ→📖"} | ${item.date}
                    </div>
                </div>
            `;
        })
        .join("");

    document.querySelectorAll(".history-item").forEach((element) => {
        element.addEventListener("click", () => {
            const item = translationHistory.find(
                (entry) => entry.id === Number(element.dataset.id)
            );

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

            document
                .getElementById("history-sidebar")
                .classList.remove("open");
        });
    });
}

function clearHistory() {
    translationHistory = [];

    localStorage.setItem("ronHistory", "[]");

    renderHistory();
}

/* ─────────────────────────────────────────────
   AUTO TRANSLATION
───────────────────────────────────────────── */

function triggerTranslation() {
    const text = inputArea.value;

    if (!text.trim()) {
        outputDiv.textContent = "...";
        return;
    }

    const translated = translateToRon(text);

    typewriterEffect(outputDiv, translated);

    saveToHistory(text, translated, "eng-to-ron");
}

function triggerReverseTranslation() {
    const text = ronInputArea.value;

    if (!text.trim()) {
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

    const fileButton = zone.querySelector(".file-btn");

    if (fileButton) {
        fileButton.addEventListener("click", () => {
            fileInput.click();
        });
    }

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];

        if (file) {
            translateFile(file, mode);
        }
    });

    zone.addEventListener("dragover", (event) => {
        event.preventDefault();

        zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", () => {
        zone.classList.remove("drag-over");
    });

    zone.addEventListener("drop", (event) => {
        event.preventDefault();

        zone.classList.remove("drag-over");

        const file = event.dataTransfer.files[0];

        if (file) {
            translateFile(file, mode);
        }
    });
}

/* ─────────────────────────────────────────────
   COPY AND DOWNLOAD
───────────────────────────────────────────── */

function downloadTranslation() {
    const content =
        currentMode === "eng-to-ron"
            ? outputDiv.textContent
            : englishOutputDiv.textContent;

    const filename =
        currentMode === "eng-to-ron"
            ? "ron_translation.txt"
            : "english_translation.txt";

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

    link.remove();

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
    } catch {
        const textarea = document.createElement("textarea");

        textarea.value = text;

        document.body.appendChild(textarea);

        textarea.select();

        document.execCommand("copy");

        textarea.remove();
    }

    showCopiedState(button);
}

/* ─────────────────────────────────────────────
   PARTICLES
───────────────────────────────────────────── */

function createParticles() {
    const particlesContainer = document.getElementById("particles");

    if (!particlesContainer) return;

    const runes = [
        "ᚱ", "ᛟ", "ᚾ",
        "ᚨ", "ᛒ", "ᚲ",
        "ᛞ", "ᛖ", "ᚠ"
    ];

    for (let i = 0; i < 30; i += 1) {
        const particle = document.createElement("div");

        particle.classList.add("particle");

        particle.textContent =
            runes[Math.floor(Math.random() * runes.length)];

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

    historyToggle?.addEventListener("click", () => {
        historySidebar.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
        if (
            historySidebar &&
            !historySidebar.contains(event.target) &&
            event.target !== historyToggle
        ) {
            historySidebar.classList.remove("open");
        }
    });

    clearHistoryBtn?.addEventListener("click", clearHistory);

    document
        .getElementById("download-btn-eng")
        ?.addEventListener("click", downloadTranslation);

    document
        .getElementById("download-btn-ron")
        ?.addEventListener("click", downloadTranslation);

    setupDragAndDrop(
        "drop-zone-eng",
        "file-input-eng",
        "eng-to-ron"
    );

    setupDragAndDrop(
        "drop-zone-ron",
        "file-input-ron",
        "ron-to-eng"
    );

    engToRonBtn.addEventListener("click", () => {
        currentMode = "eng-to-ron";

        engToRonBtn.classList.add("active");
        ronToEngBtn.classList.remove("active");

        engToRonArea.classList.remove("hidden");
        ronToEngArea.classList.add("hidden");
    });

    ronToEngBtn.addEventListener("click", () => {
        currentMode = "ron-to-eng";

        ronToEngBtn.classList.add("active");
        engToRonBtn.classList.remove("active");

        ronToEngArea.classList.remove("hidden");
        engToRonArea.classList.add("hidden");
    });

    inputArea.addEventListener("input", (event) => {
        charCountEng.textContent = `${inputArea.value.length} characters`;

        /* Sound happens instantly when a key is typed */
        playTypingSound(event);

        /* Translation begins after only 20ms */
        clearTimeout(englishTranslationTimer);

        englishTranslationTimer = setTimeout(
            triggerTranslation,
            TRANSLATION_DELAY
        );
    });

    ronInputArea.addEventListener("input", (event) => {
        charCountRon.textContent = `${ronInputArea.value.length} characters`;

        /* Sound happens instantly when a key is typed */
        playTypingSound(event);

        /* Translation begins after only 20ms */
        clearTimeout(ronTranslationTimer);

        ronTranslationTimer = setTimeout(
            triggerReverseTranslation,
            TRANSLATION_DELAY
        );
    });

    copyBtnEng.addEventListener("click", () => {
        copyText(outputDiv.textContent, copyBtnEng);
    });

    copyBtnRon.addEventListener("click", () => {
        copyText(englishOutputDiv.textContent, copyBtnRon);
    });

    document.addEventListener("pointerdown", initAudio, {
        once: true
    });

    document.addEventListener("keydown", initAudio, {
        once: true
    });
}

/* ─────────────────────────────────────────────
   PWA
───────────────────────────────────────────── */

function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register("service-worker.js")
            .catch((error) => {
                console.warn(
                    "Service worker registration failed:",
                    error
                );
            });
    }
}

/* ─────────────────────────────────────────────
   START
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
