// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAaes6rfnB-MaNnQl94Vy4RZoWQKhQoI-U",
    authDomain: "rhythmuslehrer-werkstattschule.firebaseapp.com",
    databaseURL: "https://rhythmuslehrer-werkstattschule-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "rhythmuslehrer-werkstattschule",
    storageBucket: "rhythmuslehrer-werkstattschule.firebasestorage.app",
    messagingSenderId: "55494178199",
    appId: "1:55494178199:web:da34e02ff8a90bbdcdc0d2"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentGameCode = null;
let currentQuestionIndex = 0;
let totalQuestions = 10;
let gameQuestions = [];
let audioContext;
let currentInstrument = 'sine';
let rhythms = {};

// Load rhythms database from GitHub
// ⚠️ WICHTIG: HIER DEINE GITHUB-URL EINTRAGEN! ⚠️
// Format: https://raw.githubusercontent.com/jonathanhoegg-ai/rhythmuslehrer-app/main/rhythms-database.json
async function loadRhythmsDatabase() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/jonathanhoegg-ai/rhythmuslehrer-app/main/rhythms-database.json');
        rhythms = await response.json();
        console.log('Rhythmus-Datenbank geladen:', Object.keys(rhythms));
    } catch (error) {
        console.error('Fehler beim Laden der Datenbank:', error);
        alert('Rhythmus-Datenbank konnte nicht geladen werden. Bitte Internetverbindung prüfen!');
    }
}

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'game') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('gameTab').classList.add('active');
    } else if (tab === 'rhythms') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('rhythmsTab').classList.add('active');
        displayAllRhythms();
    }
}

function displayAllRhythms() {
    const timeSignature = document.getElementById('viewTimeSignature').value;
    const difficulty = document.getElementById('viewDifficulty').value;
    const withPauses = document.getElementById('viewPauses').checked;
    
    const rhythmList = document.getElementById('rhythmList');
    
    if (!rhythms[timeSignature]) {
        rhythmList.innerHTML = '<p>Rhythmen werden geladen...</p>';
        return;
    }
    
    const source = withPauses 
        ? rhythms[timeSignature][difficulty].withPauses 
        : rhythms[timeSignature][difficulty].withoutPauses;
    
    if (source.length === 0) {
        rhythmList.innerHTML = '<p>Keine Rhythmen für diese Auswahl vorhanden.</p>';
        return;
    }
    
    rhythmList.innerHTML = source.map((rhythm, index) => `
        <div class="rhythm-item">
            <div class="notation">${rhythm.notation}</div>
            <p><strong>Beschreibung:</strong> ${rhythm.description}</p>
            <p><strong>Pattern:</strong> ${rhythm.pattern.join(', ')}</p>
        </div>
    `).join('');
}

async function createGame() {
    initAudio();
    currentGameCode = generateGameCode();
    
    const timeSignature = document.getElementById('timeSignature').value;
    const difficulty = document.getElementById('difficulty').value;
    const includePauses = document.getElementById('includePauses').checked;
    const instrument = document.getElementById('instrument').value;
    currentInstrument = instrument;
    
    if (!rhythms[timeSignature]) {
        alert('Rhythmen noch nicht geladen! Bitte warten...');
        return;
    }
    
    gameQuestions = generateQuestions(timeSignature, difficulty, includePauses, 10);
    
    if (gameQuestions.length === 0) {
        alert('Nicht genug Rhythmen für diese Einstellung!');
        return;
    }
    
    await database.ref('games/' + currentGameCode).set({
        code: currentGameCode,
        timeSignature: timeSignature,
        difficulty: difficulty,
        includePauses: includePauses,
        instrument: instrument,
        questions: gameQuestions,
        status: 'waiting',
        createdAt: Date.now(),
        currentQuestion: 0
    });
    
    document.getElementById('gameCodeDisplay').style.display = 'block';
    document.getElementById('gameCodeText').textContent = currentGameCode;
    document.getElementById('qrSection').style.display = 'block';
    document.getElementById('createGameBtn').style.display = 'none';
    document.getElementById('startGameBtn').style.display = 'inline-block';
    document.getElementById('endGameBtn').style.display = 'inline-block';
    document.getElementById('playersList').style.display = 'block';
    
    // ⚠️ WICHTIG: HIER DEINE GITHUB PAGES URL EINTRAGEN! ⚠️
    // Format: https://DEIN-USERNAME.github.io/DEIN-REPO/student.html?game= 
    const qrUrl = 'https://jonathanhoegg-ai.github.io/rhythmuslehrer-app/student.html?game=' + currentGameCode;
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // Leeren
    
    // QR-Code Canvas erstellen (mit Fehlerbehandlung)
    try {
        if (typeof QRCode === 'undefined') {
            qrContainer.innerHTML = '<p style="color: red;">QR-Code Library lädt noch... Bitte kurz warten und nochmal versuchen!</p>';
            return;
        }
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, qrUrl, {
            width: 250,
            margin: 2,
            color: {
                dark: '#667eea',
                light: '#ffffff'
            }
        });
        qrContainer.appendChild(canvas);
    } catch (error) {
        console.error('QR-Code Fehler:', error);
        qrContainer.innerHTML = `<p style="color: red;">QR-Code konnte nicht erstellt werden. Manueller Code: ${currentGameCode}</p>`;
    }
    
    // Listen for players
    database.ref('games/' + currentGameCode + '/players').on('value', (snapshot) => {
        updatePlayersList(snapshot.val());
    });
}

function generateQuestions(timeSignature, difficulty, includePauses, count) {
    const pool = includePauses 
        ? [...rhythms[timeSignature][difficulty].withoutPauses, ...rhythms[timeSignature][difficulty].withPauses]
        : rhythms[timeSignature][difficulty].withoutPauses;
    
    if (pool.length < 4) {
        return [];
    }
    
    const questions = [];
    for (let i = 0; i < count; i++) {
        const correct = pool[Math.floor(Math.random() * pool.length)];
        const options = [correct];
        
        while (options.length < 4) {
            const option = pool[Math.floor(Math.random() * pool.length)];
            if (!options.find(o => o.notation === option.notation)) {
                options.push(option);
            }
        }
        
        options.sort(() => Math.random() - 0.5);
        const correctIndex = options.findIndex(o => o.notation === correct.notation);
        
        questions.push({
            notation: correct.notation,
            options: options,
            correctIndex: correctIndex
        });
    }
    
    return questions;
}

function updatePlayersList(players) {
    const container = document.getElementById('playersContainer');
    const count = document.getElementById('playerCount');
    
    if (!players) {
        container.innerHTML = '<p>Noch keine Teilnehmer...</p>';
        count.textContent = '0';
        return;
    }
    
    const playerArray = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
    count.textContent = playerArray.length;
    
    container.innerHTML = playerArray.map((player, index) => `
        <div class="player-item">
            <span>${index + 1}. 👤 ${player.name}</span>
            <span class="score">${player.score || 0} Punkte</span>
        </div>
    `).join('');
}

async function updateLiveInstrument() {
    const newInstrument = document.getElementById('liveInstrument').value;
    currentInstrument = newInstrument;
    
    await database.ref('games/' + currentGameCode).update({
        instrument: newInstrument
    });
}

async function startGame() {
    await database.ref('games/' + currentGameCode).update({
        status: 'playing',
        currentQuestion: 0
    });
    
    document.getElementById('startGameBtn').style.display = 'none';
    document.getElementById('questionDisplay').style.display = 'block';
    document.getElementById('gameCodeDisplay').style.display = 'none';
    document.getElementById('qrSection').style.display = 'none';
    
    displayTeacherQuestion(0);
}

function displayTeacherQuestion(index) {
    if (index >= gameQuestions.length) {
        endGame();
        return;
    }
    
    currentQuestionIndex = index;
    const question = gameQuestions[index];
    
    document.getElementById('questionNumber').textContent = index + 1;
    document.getElementById('totalQuestions').textContent = gameQuestions.length;
    document.getElementById('mainNotation').textContent = question.notation;
    
    document.getElementById('liveInstrument').value = currentInstrument;
    
    for (let i = 0; i < 4; i++) {
        const card = document.getElementById('teacherOption' + i);
        card.innerHTML = `<button class="play-btn" onclick="playTeacherSound(${i})">▶️</button>`;
    }
}

function playTeacherSound(optionIndex) {
    const question = gameQuestions[currentQuestionIndex];
    const rhythm = question.options[optionIndex];
    playRhythmWithMetronome(rhythm.pattern);
}

async function showRanking() {
    const snapshot = await database.ref('games/' + currentGameCode + '/players').once('value');
    const players = snapshot.val();
    
    if (!players) return;
    
    const playerArray = Object.entries(players).map(([id, data]) => ({
        id,
        name: data.name,
        score: data.score || 0,
        correct: data.correctAnswers || 0
    }));
    
    playerArray.sort((a, b) => b.score - a.score);
    
    const rankingList = document.getElementById('rankingList');
    rankingList.innerHTML = playerArray.map((player, index) => {
        let className = 'ranking-item';
        if (index === 0) className += ' first';
        else if (index === 1) className += ' second';
        else if (index === 2) className += ' third';
        
        let medal = '';
        if (index === 0) medal = '🥇 ';
        else if (index === 1) medal = '🥈 ';
        else if (index === 2) medal = '🥉 ';
        
        return `
            <div class="${className}">
                <span>${medal}${index + 1}. ${player.name}</span>
                <span>${player.score} Punkte</span>
            </div>
        `;
    }).join('');
    
    const overlay = document.getElementById('rankingOverlay');
    overlay.style.display = 'flex';
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 5000);
}

async function nextQuestion() {
    await showRanking();
    
    const nextIndex = currentQuestionIndex + 1;
    
    await database.ref('games/' + currentGameCode).update({
        currentQuestion: nextIndex
    });
    
    displayTeacherQuestion(nextIndex);
}

async function endGame() {
    await database.ref('games/' + currentGameCode).update({
        status: 'finished'
    });
    
    const snapshot = await database.ref('games/' + currentGameCode + '/players').once('value');
    const players = snapshot.val();
    
    showResults(players);
}

function showResults(players) {
    document.getElementById('questionDisplay').style.display = 'none';
    document.getElementById('resultsView').style.display = 'block';
    
    if (!players) return;
    
    const playerArray = Object.entries(players).map(([id, data]) => ({
        id,
        name: data.name,
        score: data.score || 0,
        correct: data.correctAnswers || 0
    }));
    
    playerArray.sort((a, b) => b.score - a.score);
    
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = playerArray.map((player, index) => {
        let medal = '';
        if (index === 0) medal = '🥇 ';
        else if (index === 1) medal = '🥈 ';
        else if (index === 2) medal = '🥉 ';
        
        return `
            <tr>
                <td>${medal}${index + 1}</td>
                <td>${player.name}</td>
                <td>${player.score}</td>
                <td>${player.correct}</td>
            </tr>
        `;
    }).join('');
}

// Metronom + Rhythmus abspielen
function playRhythmWithMetronome(pattern) {
    if (!audioContext) initAudio();
    
    const tempo = 120;
    const beatDuration = 60 / tempo;
    let currentTime = audioContext.currentTime;
    
    // 1 Takt Metronom vorzählen (4 Schläge)
    for (let i = 0; i < 4; i++) {
        playMetronomeClick(currentTime + (i * beatDuration), i === 0);
    }
    
    // Rhythmus nach Vorzählen
    currentTime += 4 * beatDuration;
    
    pattern.forEach(duration => {
        if (duration > 0) {
            playNote(currentTime, duration * beatDuration, currentInstrument);
        } else if (duration < 0) {
            // Leises Rauschen bei Pausen (nur wenn duration negativ)
            playPauseNoise(currentTime, Math.abs(duration) * beatDuration);
        }
        currentTime += Math.abs(duration) * beatDuration;
    });
}

function playMetronomeClick(startTime, isFirst) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = isFirst ? 1000 : 800; // Erste Note höher
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.05);
}

function playPauseNoise(startTime, duration) {
    const actualDuration = Math.abs(duration);
    if (actualDuration < 0.01) return; // Skip sehr kurze Pausen
    const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * actualDuration));
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.02; // Sehr leise
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.05;
    
    source.start(startTime);
}

function playNote(startTime, duration, instrument) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    switch(instrument) {
        case 'sine':
            oscillator.type = 'sine';
            oscillator.frequency.value = 440;
            break;
        case 'square':
            oscillator.type = 'square';
            oscillator.frequency.value = 220;
            break;
        case 'drum':
            oscillator.type = 'sine';
            oscillator.frequency.value = 100;
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            break;
        case 'bass':
            oscillator.type = 'triangle';
            oscillator.frequency.value = 110;
            break;
        case 'clap':
            const bufferSize = audioContext.sampleRate * 0.1;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0.2;
            source.start(startTime);
            return;
        case 'hihat':
            const hhBufferSize = audioContext.sampleRate * 0.05;
            const hhBuffer = audioContext.createBuffer(1, hhBufferSize, audioContext.sampleRate);
            const hhData = hhBuffer.getChannelData(0);
            for (let i = 0; i < hhBufferSize; i++) {
                hhData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (hhBufferSize * 0.2));
            }
            const hhSource = audioContext.createBufferSource();
            hhSource.buffer = hhBuffer;
            hhSource.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0.3;
            hhSource.start(startTime);
            return;
    }
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// Init on load
window.addEventListener('load', async () => {
    await loadRhythmsDatabase();
    displayAllRhythms();
});
