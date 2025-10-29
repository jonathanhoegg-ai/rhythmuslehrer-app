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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Game State
let currentGameCode = null;
let currentQuestionIndex = 0;
let totalQuestions = 10;
let gameQuestions = [];
let audioContext;
let currentInstrument = 'sine';

// Corrected Rhythm Database - All rhythms FIT their time signature!
const rhythms = {
    '4/4': {
        beginner: {
            withoutPauses: [
                { notation: '| 4/4  ♩ ♩ ♩ ♩ |', pattern: [1, 1, 1, 1], description: 'Vier Viertelnoten' },
                { notation: '| 4/4  ♪♪ ♪♪ ♩ ♩ |', pattern: [0.5, 0.5, 0.5, 0.5, 1, 1], description: 'Zwei Achtel, zwei Achtel, zwei Viertel' },
                { notation: '| 4/4  𝅗𝅥 𝅗𝅥 |', pattern: [2, 2], description: 'Zwei Halbe' },
                { notation: '| 4/4  ♩ ♪♪ ♩ ♩ |', pattern: [1, 0.5, 0.5, 1, 1], description: 'Viertel, zwei Achtel, zwei Viertel' },
                { notation: '| 4/4  𝅝 |', pattern: [4], description: 'Eine Ganze' }
            ],
            withPauses: [
                { notation: '| 4/4  ♩ 𝄽 ♩ ♩ |', pattern: [1, 0, 1, 1], description: 'Viertel-Pause-zwei Viertel' },
                { notation: '| 4/4  𝄽 ♩ ♩ ♩ |', pattern: [0, 1, 1, 1], description: 'Pause-drei Viertel' },
                { notation: '| 4/4  ♩ ♩ 𝄽 ♩ |', pattern: [1, 1, 0, 1], description: 'Zwei Viertel-Pause-Viertel' }
            ]
        },
        intermediate: {
            withoutPauses: [
                { notation: '| 4/4  ♩. ♪ ♩ ♩ |', pattern: [1.5, 0.5, 1, 1], description: 'Punktierte Viertel, Achtel, zwei Viertel' },
                { notation: '| 4/4  ♪♪ ♪♪ ♪♪ ♪♪ |', pattern: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], description: 'Acht Achtelnoten' },
                { notation: '| 4/4  ♩ ♩. ♪ ♩ |', pattern: [1, 1.5, 0.5, 1], description: 'Viertel, punktierte Viertel, Achtel, Viertel' },
                { notation: '| 4/4  𝅗𝅥 ♩ ♩ |', pattern: [2, 1, 1], description: 'Halbe, zwei Viertel' }
            ],
            withPauses: [
                { notation: '| 4/4  ♩. ♪ 𝄽 ♩ |', pattern: [1.5, 0.5, 0, 1], description: 'Punktierte Viertel, Achtel, Pause, Viertel' },
                { notation: '| 4/4  𝅗𝅥 𝄼 |', pattern: [2, 0], description: 'Halbe Note, Halbe Pause' }
            ]
        },
        advanced: {
            withoutPauses: [
                { notation: '| 4/4  ♬♬ ♪♪ ♩ ♩ |', pattern: [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 1, 1], description: 'Vier Sechzehntel, zwei Achtel, zwei Viertel' },
                { notation: '| 4/4  ♩ ♬♬ ♪ ♩ ♩ |', pattern: [1, 0.25, 0.25, 0.25, 0.25, 0.5, 1, 1], description: 'Viertel, vier Sechzehntel, Achtel, zwei Viertel' }
            ],
            withPauses: [
                { notation: '| 4/4  ♩ 𝄽 ♬♬ ♩ ♩ |', pattern: [1, 0, 0.25, 0.25, 0.25, 0.25, 1, 1], description: 'Viertel, Pause, vier Sechzehntel, zwei Viertel' }
            ]
        }
    },
    '3/4': {
        beginner: {
            withoutPauses: [
                { notation: '| 3/4  ♩ ♩ ♩ |', pattern: [1, 1, 1], description: 'Drei Viertelnoten' },
                { notation: '| 3/4  𝅗𝅥 ♩ |', pattern: [2, 1], description: 'Halbe und Viertel' },
                { notation: '| 3/4  ♪♪ ♩ ♩ |', pattern: [0.5, 0.5, 1, 1], description: 'Zwei Achtel, zwei Viertel' }
            ],
            withPauses: [
                { notation: '| 3/4  ♩ 𝄽 ♩ |', pattern: [1, 0, 1], description: 'Viertel-Pause-Viertel' },
                { notation: '| 3/4  𝅗𝅥 𝄽 |', pattern: [2, 0], description: 'Halbe-Pause' }
            ]
        },
        intermediate: {
            withoutPauses: [
                { notation: '| 3/4  ♩. ♪ ♩ |', pattern: [1.5, 0.5, 1], description: 'Punktierte Viertel, Achtel, Viertel' },
                { notation: '| 3/4  ♪♪ ♪♪ ♪♪ |', pattern: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], description: 'Sechs Achtelnoten' }
            ],
            withPauses: [
                { notation: '| 3/4  ♩ 𝄽 𝄽 |', pattern: [1, 0, 0], description: 'Viertel, zwei Pausen' }
            ]
        },
        advanced: {
            withoutPauses: [
                { notation: '| 3/4  ♬♬ ♪ ♩ ♩ |', pattern: [0.25, 0.25, 0.25, 0.25, 0.5, 1, 1], description: 'Vier Sechzehntel, Achtel, zwei Viertel' }
            ],
            withPauses: []
        }
    },
    '6/8': {
        beginner: {
            withoutPauses: [
                { notation: '| 6/8  ♪ ♪ ♪ ♪ ♪ ♪ |', pattern: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], description: 'Sechs Achtelnoten' },
                { notation: '| 6/8  ♩. ♩. |', pattern: [1.5, 1.5], description: 'Zwei punktierte Viertel' }
            ],
            withPauses: [
                { notation: '| 6/8  ♩. 𝄽. |', pattern: [1.5, 0], description: 'Punktierte Viertel, Pause' }
            ]
        },
        intermediate: {
            withoutPauses: [
                { notation: '| 6/8  ♩. ♪ ♪ ♪ |', pattern: [1.5, 0.5, 0.5, 0.5], description: 'Punktierte Viertel, drei Achtel' },
                { notation: '| 6/8  ♪ ♪ ♪ ♩. |', pattern: [0.5, 0.5, 0.5, 1.5], description: 'Drei Achtel, punktierte Viertel' }
            ],
            withPauses: []
        },
        advanced: {
            withoutPauses: [
                { notation: '| 6/8  ♪ ♬♬ ♪ ♪ ♪ |', pattern: [0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5], description: 'Achtel, vier Sechzehntel, drei Achtel' }
            ],
            withPauses: []
        }
    }
};

// Feedback messages
const correctMessages = [
    '🎉 Perfekt!', '🔥 Mega gut!', '⭐ Spitze!', '💪 Richtig stark!',
    '🎵 Musikgenie!', '👏 Bravo!', '🌟 Fantastisch!', '🎊 Super!',
    '🚀 Hammer!', '💯 Genau richtig!'
];

const wrongMessages = [
    '🤔 Fast! Versuch\'s nochmal!', '💭 Knapp daneben!', '🎯 Beim nächsten Mal!',
    '🎪 Nicht ganz, aber gut probiert!', '🌈 Weiter so!', '🎨 Fast richtig!',
    '🎭 Nah dran!', '🎪 Üben macht den Meister!', '🎬 Nächstes Mal!', '🎸 Bleib dran!'
];

// Audio Context
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Generate random game code
function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Switch Tab
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

// Display all rhythms
function displayAllRhythms() {
    const timeSignature = document.getElementById('viewTimeSignature').value;
    const difficulty = document.getElementById('viewDifficulty').value;
    const withPauses = document.getElementById('viewPauses').checked;
    
    const rhythmList = document.getElementById('rhythmList');
    const source = withPauses ? rhythms[timeSignature][difficulty].withPauses : rhythms[timeSignature][difficulty].withoutPauses;
    
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

// Add custom rhythm
function addCustomRhythm() {
    const timeSignature = document.getElementById('newTimeSignature').value;
    const difficulty = document.getElementById('newDifficulty').value;
    const notation = document.getElementById('newNotation').value.trim();
    const patternStr = document.getElementById('newPattern').value.trim();
    const description = document.getElementById('newDescription').value.trim();
    const hasPauses = document.getElementById('newHasPauses').checked;
    
    if (!notation || !patternStr || !description) {
        alert('Bitte alle Felder ausfüllen!');
        return;
    }
    
    const pattern = patternStr.split(',').map(n => parseFloat(n.trim()));
    
    // Validate pattern sums
    const sum = pattern.reduce((a, b) => a + (b > 0 ? b : 0), 0);
    const expected = {
        '4/4': 4,
        '3/4': 3,
        '6/8': 3
    }[timeSignature];
    
    if (Math.abs(sum - expected) > 0.01) {
        alert(`Pattern passt nicht zur Taktart ${timeSignature}! Summe sollte ${expected} sein, ist aber ${sum}.`);
        return;
    }
    
    const newRhythm = { notation, pattern, description };
    const target = hasPauses ? 'withPauses' : 'withoutPauses';
    
    rhythms[timeSignature][difficulty][target].push(newRhythm);
    
    alert('Rhythmus hinzugefügt!');
    document.getElementById('newNotation').value = '';
    document.getElementById('newPattern').value = '';
    document.getElementById('newDescription').value = '';
    
    displayAllRhythms();
}

// Create Game
async function createGame() {
    initAudio();
    currentGameCode = generateGameCode();
    
    const timeSignature = document.getElementById('timeSignature').value;
    const difficulty = document.getElementById('difficulty').value;
    const includePauses = document.getElementById('includePauses').checked;
    const instrument = document.getElementById('instrument').value;
    currentInstrument = instrument;
    
    // Generate questions
    gameQuestions = generateQuestions(timeSignature, difficulty, includePauses, 10);
    
    // Save game to Firebase
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
    
    // Show game code and QR
    document.getElementById('gameCodeDisplay').style.display = 'block';
    document.getElementById('gameCodeText').textContent = currentGameCode;
    document.getElementById('qrSection').style.display = 'block';
    document.getElementById('createGameBtn').style.display = 'none';
    document.getElementById('startGameBtn').style.display = 'inline-block';
    document.getElementById('endGameBtn').style.display = 'inline-block';
    document.getElementById('playersList').style.display = 'block';
    
    // Generate QR Code
    const qrUrl = 'https://jonathanhoegg-ai.github.io/rhythmuslehrer-app/student.html?game=' + currentGameCode;
    document.getElementById('qrcode').innerHTML = '';
    
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, qrUrl, {
        width: 250,
        margin: 2,
        color: {
            dark: '#667eea',
            light: '#ffffff'
        }
    }, function(error) {
        if (error) console.error(error);
        document.getElementById('qrcode').appendChild(canvas);
    });
    
    // Listen for players
    database.ref('games/' + currentGameCode + '/players').on('value', (snapshot) => {
        updatePlayersList(snapshot.val());
    });
}

// Generate questions
function generateQuestions(timeSignature, difficulty, includePauses, count) {
    const pool = includePauses 
        ? [...rhythms[timeSignature][difficulty].withoutPauses, ...rhythms[timeSignature][difficulty].withPauses]
        : rhythms[timeSignature][difficulty].withoutPauses;
    
    if (pool.length < 4) {
        alert('Nicht genug Rhythmen für diese Einstellung!');
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
        
        // Shuffle options
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

// Update players list
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

// Update live instrument
async function updateLiveInstrument() {
    const newInstrument = document.getElementById('liveInstrument').value;
    currentInstrument = newInstrument;
    
    await database.ref('games/' + currentGameCode).update({
        instrument: newInstrument
    });
}

// Start Game
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

// Display question for teacher
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
    
    // Sync live instrument selector
    document.getElementById('liveInstrument').value = currentInstrument;
    
    // Display options
    for (let i = 0; i < 4; i++) {
        const card = document.getElementById('teacherOption' + i);
        card.innerHTML = `<button class="play-btn" onclick="playTeacherSound(${i})">▶️</button>`;
    }
}

// Play sound for teacher
function playTeacherSound(optionIndex) {
    const question = gameQuestions[currentQuestionIndex];
    const rhythm = question.options[optionIndex];
    playRhythm(rhythm.pattern);
}

// Show ranking
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
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 5000);
}

// Next question
async function nextQuestion() {
    // Show ranking
    await showRanking();
    
    const nextIndex = currentQuestionIndex + 1;
    
    await database.ref('games/' + currentGameCode).update({
        currentQuestion: nextIndex
    });
    
    displayTeacherQuestion(nextIndex);
}

// End game
async function endGame() {
    await database.ref('games/' + currentGameCode).update({
        status: 'finished'
    });
    
    // Get final results
    const snapshot = await database.ref('games/' + currentGameCode + '/players').once('value');
    const players = snapshot.val();
    
    showResults(players);
}

// Show results
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

// Play rhythm
function playRhythm(pattern) {
    if (!audioContext) initAudio();
    
    const tempo = 120;
    const beatDuration = 60 / tempo;
    let currentTime = audioContext.currentTime;
    
    pattern.forEach(duration => {
        if (duration > 0) {
            playNote(currentTime, duration * beatDuration, currentInstrument);
        }
        currentTime += duration * beatDuration;
    });
}

// Play single note
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

// Initialize on load
window.addEventListener('load', () => {
    displayAllRhythms();
});