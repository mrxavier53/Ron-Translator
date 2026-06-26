const RON_RUNE_MAP = {
    a: 'ᚨ', b: 'ᛒ', c: 'ᚲ', d: 'ᛞ', e: 'ᛖ',
    f: 'ᚠ', g: 'ᚷ', h: 'ᚺ', i: 'ᛁ', j: 'ᛃ',
    k: 'ᚲ', l: 'ᛚ', m: 'ᛗ', n: 'ᚾ', o: 'ᛟ',
    p: 'ᛈ', q: 'ᚲ', r: 'ᚱ', s: 'ᛋ', t: 'ᛏ',
    u: 'ᚢ', v: 'ᚠ', w: 'ᚹ', x: 'ᛋ', y: 'ᛃ',
    z: 'ᛉ', ' ': ' '
};

const REVERSE_RUNE_MAP = {
    'ᚨ': 'a', 'ᛒ': 'b', 'ᚲ': 'c', 'ᛞ': 'd', 'ᛖ': 'e',
    'ᚠ': 'f', 'ᚷ': 'g', 'ᚺ': 'h', 'ᛁ': 'i', 'ᛃ': 'j',
    'ᛚ': 'l', 'ᛗ': 'm', 'ᚾ': 'n', 'ᛟ': 'o', 'ᛈ': 'p',
    'ᚱ': 'r', 'ᛋ': 's', 'ᛏ': 't', 'ᚢ': 'u', 'ᚹ': 'w',
    'ᛉ': 'z', ' ': ' '
};

const inputArea = document.getElementById('english-input');
const outputDiv = document.getElementById('ron-output');
const copyBtnEng = document.getElementById('copy-btn-eng');
const charCountEng = document.getElementById('eng-char-count');

const ronInputArea = document.getElementById('ron-input');
const englishOutputDiv = document.getElementById('english-output');
const copyBtnRon = document.getElementById('copy-btn-ron');
const charCountRon = document.getElementById('ron-char-count');

const loadingScreen = document.getElementById('loading-screen');
const engToRonBtn = document.getElementById('eng-to-ron-btn');
const ronToEngBtn = document.getElementById('ron-to-eng-btn');
const engToRonArea = document.getElementById('eng-to-ron-area');
const ronToEngArea = document.getElementById('ron-to-eng-area');

let currentMode = 'eng-to-ron';
let translationHistory = JSON.parse(localStorage.getItem('ronHistory') || '[]');
let audioContext = null;
let typingTimer;
let ronTypingTimer;
let musicEnabled = false;
let musicTimer = null;
let musicGainNode = null;
const AUTO_TRANSLATE_DELAY = 20;
const RUNE_REVEAL_DELAY = 20;

function translateToRon(text) {
    return text
        .toLowerCase()
        .split('')
        .map((char) => RON_RUNE_MAP[char] || char)
        .join('');
}

function translateToEnglish(text) {
    return text
        .split('')
        .map((char) => REVERSE_RUNE_MAP[char] || char)
        .join('');
}

function initAudio() {
    if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }
}

function makeTone({ frequency, duration, volume, type = 'sine', slideTo = null }) {
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
    gainNode.gain.exponentialRampToValueAtTime(0.00001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
}

/* Plays immediately when the user types a new character. */
function playTypingSound(event) {
    if (event?.inputType?.startsWith('delete') || event?.isComposing) return;

    makeTone({
        frequency: 280 + Math.random() * 55,
        duration: 0.028,
        volume: 0.025,
        type: 'triangle',
        slideTo: 215
    });
}

/* Magical click while each translated rune/letter appears. */
function playStoneClick() {
    makeTone({
        frequency: 600 + Math.random() * 200,
        duration: 0.075,
        volume: 0.07,
        type: 'sine',
        slideTo: 460
    });
}

/* Small finish sound after the whole translation is displayed. */
function playTranslationCompleteSound() {
    makeTone({ frequency: 520, duration: 0.14, volume: 0.06, type: 'sine', slideTo: 730 });

    setTimeout(() => {
        makeTone({ frequency: 780, duration: 0.20, volume: 0.05, type: 'sine', slideTo: 970 });
    }, 85);
}

/* Gentle procedural ambient music. No downloaded MP3 is used. */
function playAmbientNote(frequency, startTime, duration, volume) {
    if (!audioContext || !musicGainNode) return;

    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.detune.setValueAtTime((Math.random() - 0.5) * 8, startTime);

    noteGain.gain.setValueAtTime(0.00001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(volume, startTime + 0.35);
    noteGain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

    oscillator.connect(noteGain);
    noteGain.connect(musicGainNode);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
}

function scheduleAmbientPhrase() {
    if (!musicEnabled || !audioContext || !musicGainNode) return;

    const now = audioContext.currentTime + 0.03;
    const roots = [146.83, 174.61, 196.00, 164.81];
    const root = roots[Math.floor(Math.random() * roots.length)];

    playAmbientNote(root, now, 3.3, 0.10);
    playAmbientNote(root * 1.498, now + 0.15, 3.0, 0.055);
    playAmbientNote(root * 2, now + 0.40, 2.65, 0.032);
}

function startBackgroundMusic() {
    initAudio();
    if (!audioContext || musicEnabled) return;

    musicEnabled = true;
    musicGainNode = audioContext.createGain();
    musicGainNode.gain.setValueAtTime(0.20, audioContext.currentTime);
    musicGainNode.connect(audioContext.destination);

    scheduleAmbientPhrase();
    musicTimer = window.setInterval(scheduleAmbientPhrase, 3600);
    updateMusicButton();
}

function stopBackgroundMusic() {
    musicEnabled = false;
    if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
    }
    if (musicGainNode) {
        try { musicGainNode.disconnect(); } catch (_) {}
        musicGainNode = null;
    }
    updateMusicButton();
}

function updateMusicButton() {
    const button = document.getElementById('music-toggle');
    if (!button) return;

    button.hidden = false;
    button.textContent = musicEnabled ? '♫ Music: ON' : '♫ Music: OFF';
    button.setAttribute('aria-pressed', String(musicEnabled));
}

function openTranslatorAfterNotice(useMusic) {
    if (useMusic) startBackgroundMusic();
    else stopBackgroundMusic();

    const warning = document.getElementById('music-warning');
    const loading = document.getElementById('loading-screen');

    warning.classList.add('is-hidden');
    loading.style.display = 'flex';
    loading.style.opacity = '1';

    window.setTimeout(() => {
        loading.style.opacity = '0';
        window.setTimeout(() => {
            loading.style.display = 'none';
        }, 500);
    }, 900);
}

function startMusicNotice() {
    const countdown = document.getElementById('warning-countdown');
    const actions = document.getElementById('music-warning-actions');
    const musicButton = document.getElementById('enter-with-music');
    const silentButton = document.getElementById('enter-silently');

    let seconds = 4;
    countdown.textContent = `Preparing options in ${seconds}…`;

    const countdownTimer = window.setInterval(() => {
        seconds -= 1;
        if (seconds > 0) {
            countdown.textContent = `Preparing options in ${seconds}…`;
            return;
        }

        window.clearInterval(countdownTimer);
        countdown.textContent = 'Choose how you want to enter.';
        actions.hidden = false;
    }, 1000);

    musicButton.addEventListener('click', () => openTranslatorAfterNotice(true), { once: true });
    silentButton.addEventListener('click', () => openTranslatorAfterNotice(false), { once: true });
}

function typewriterEffect(element, text) {
    if (element._ronTypingTimer) clearTimeout(element._ronTypingTimer);

    element.textContent = '';
    let i = 0;

    function addChar() {
        if (i >= text.length) {
            playTranslationCompleteSound();
            return;
        }

        const character = text.charAt(i);
        element.textContent += character;

        if (character.trim()) playStoneClick();

        i += 1;
        element._ronTypingTimer = setTimeout(addChar, RUNE_REVEAL_DELAY);
    }

    addChar();
}

function saveToHistory(input, output, mode) {
    if (!input.trim() || !output.trim()) return;

    const newest = translationHistory[0];
    if (newest && newest.input === input.substring(0, 80) && newest.output === output.substring(0, 80)) {
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

    localStorage.setItem('ronHistory', JSON.stringify(translationHistory));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (translationHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No translations yet</div>';
        return;
    }

    historyList.innerHTML = translationHistory.map((item) => `
        <div class="history-item" data-id="${item.id}">
            <div class="history-text">${escapeHtml(item.input)}</div>
            <div class="history-text" style="color: #00e5ff; font-size: 0.8em;">→ ${escapeHtml(item.output)}</div>
            <div class="history-date">${item.mode === 'eng-to-ron' ? '📖→ᚱ' : 'ᚱ→📖'} | ${item.date}</div>
        </div>
    `).join('');

    document.querySelectorAll('.history-item').forEach((el) => {
        el.addEventListener('click', () => {
            const id = Number(el.dataset.id);
            const item = translationHistory.find((h) => h.id === id);
            if (!item) return;

            if (item.mode === 'eng-to-ron') {
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

            document.getElementById('history-sidebar').classList.remove('open');
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearHistory() {
    document.querySelectorAll('.history-item').forEach((item) => item.classList.add('fade-out'));

    setTimeout(() => {
        translationHistory = [];
        localStorage.setItem('ronHistory', '[]');
        renderHistory();
    }, 300);
}

function triggerTranslation() {
    const text = inputArea.value;

    if (text.trim() === '') {
        outputDiv.textContent = '...';
        return;
    }

    const translated = translateToRon(text);
    typewriterEffect(outputDiv, translated);
    saveToHistory(text, translated, 'eng-to-ron');
}

function triggerReverseTranslation() {
    const text = ronInputArea.value;

    if (text.trim() === '') {
        englishOutputDiv.textContent = '...';
        return;
    }

    const translated = translateToEnglish(text);
    typewriterEffect(englishOutputDiv, translated);
    saveToHistory(text, translated, 'ron-to-eng');
}

async function translateFile(file, mode) {
    if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
        alert('Please choose a .txt file');
        return;
    }

    const text = await file.text();

    if (mode === 'eng-to-ron') {
        inputArea.value = text;
        charCountEng.textContent = `${text.length} characters`;
        triggerTranslation();
    } else {
        ronInputArea.value = text;
        charCountRon.textContent = `${text.length} characters`;
        triggerReverseTranslation();
    }
}

function downloadTranslation() {
    let content;
    let filename;

    if (currentMode === 'eng-to-ron') {
        content = outputDiv.textContent;
        filename = 'ron_translation.txt';
    } else {
        content = englishOutputDiv.textContent;
        filename = 'english_translation.txt';
    }

    if (!content || content === '...') return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function setupDragAndDrop(zoneId, inputId, mode) {
    const zone = document.getElementById(zoneId);
    const fileInput = document.getElementById(inputId);
    if (!zone || !fileInput) return;

    const btn = zone.querySelector('.file-btn');

    if (btn) {
        btn.addEventListener('click', () => fileInput.click());
    }

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) await translateFile(file, mode);
    });

    zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', async (event) => {
        event.preventDefault();
        zone.classList.remove('drag-over');

        const file = event.dataTransfer.files[0];
        if (file) await translateFile(file, mode);
    });
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const runes = ['ᚱ', 'ᛟ', 'ᚾ', 'ᚨ', 'ᛒ', 'ᚲ', 'ᛞ', 'ᛖ', 'ᚠ'];

    if (!particlesContainer) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.textContent = runes[Math.floor(Math.random() * runes.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.animationDuration = Math.random() * 10 + 10 + 's';
        particlesContainer.appendChild(particle);
    }
}

function showCopiedState(button) {
    const copyText = button.querySelector('.copy-text');
    const copyIcon = button.querySelector('.copy-icon');

    copyIcon.textContent = '✓';
    copyText.textContent = 'Copied!';
    button.classList.add('copied');

    setTimeout(() => {
        copyIcon.textContent = '📋';
        copyText.textContent = 'Copy';
        button.classList.remove('copied');
    }, 2000);
}

async function copyText(text, button) {
    if (!text || text === '...') return;

    try {
        await navigator.clipboard.writeText(text);
        showCopiedState(button);
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showCopiedState(button);
    }
}

function setupEvents() {
    const historyToggle = document.getElementById('history-toggle');
    const historySidebar = document.getElementById('history-sidebar');
    const clearHistoryBtn = document.getElementById('clear-history');
    const downloadBtnEng = document.getElementById('download-btn-eng');
    const downloadBtnRon = document.getElementById('download-btn-ron');

    if (historyToggle && historySidebar) {
        historyToggle.addEventListener('click', () => historySidebar.classList.toggle('open'));

        document.addEventListener('click', (event) => {
            if (!historySidebar.contains(event.target) && event.target !== historyToggle) {
                historySidebar.classList.remove('open');
            }
        });
    }

    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);
    if (downloadBtnEng) downloadBtnEng.addEventListener('click', downloadTranslation);
    if (downloadBtnRon) downloadBtnRon.addEventListener('click', downloadTranslation);

    setupDragAndDrop('drop-zone-eng', 'file-input-eng', 'eng-to-ron');
    setupDragAndDrop('drop-zone-ron', 'file-input-ron', 'ron-to-eng');

    engToRonBtn.addEventListener('click', () => {
        currentMode = 'eng-to-ron';
        engToRonBtn.classList.add('active');
        ronToEngBtn.classList.remove('active');
        engToRonArea.classList.remove('hidden');
        ronToEngArea.classList.add('hidden');
    });

    ronToEngBtn.addEventListener('click', () => {
        currentMode = 'ron-to-eng';
        ronToEngBtn.classList.remove('active');
        engToRonBtn.classList.remove('active');
        ronToEngBtn.classList.add('active');
        ronToEngArea.classList.remove('hidden');
        engToRonArea.classList.add('hidden');
    });

    inputArea.addEventListener('input', (event) => {
        const text = inputArea.value;
        charCountEng.textContent = `${text.length} characters`;
        playTypingSound(event);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(triggerTranslation, AUTO_TRANSLATE_DELAY);
    });

    ronInputArea.addEventListener('input', (event) => {
        const text = ronInputArea.value;
        charCountRon.textContent = `${text.length} characters`;
        playTypingSound(event);
        clearTimeout(ronTypingTimer);
        ronTypingTimer = setTimeout(triggerReverseTranslation, AUTO_TRANSLATE_DELAY);
    });

    copyBtnEng.addEventListener('click', () => copyText(outputDiv.textContent, copyBtnEng));
    copyBtnRon.addEventListener('click', () => copyText(englishOutputDiv.textContent, copyBtnRon));

    document.addEventListener('pointerdown', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch((error) => {
            console.warn('Service worker registration failed:', error);
        });
    }
}

window.addEventListener('load', () => {
    loadingScreen.style.display = 'none';
    createParticles();
    setupEvents();
    renderHistory();
    registerServiceWorker();
    startMusicNotice();

    document.getElementById('music-toggle').addEventListener('click', () => {
        if (musicEnabled) stopBackgroundMusic();
        else startBackgroundMusic();
    });
});
