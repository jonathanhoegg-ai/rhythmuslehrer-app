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
let currentPlayerId = null;
let currentQuestionIndex = 0;
let audioContext;
let currentInstrument = 'sine';
let hasAnswered = false;

const correctMessages = ['🎉 Perfekt!', '🔥 Mega gut!', '⭐ Spitze!', '💪 Richtig stark!', '🎵 Musikgenie!', '👏 Bravo!', '🌟 Fantastisch!', '🎊 Super!', '🚀 Hammer!', '💯 Genau richtig!'];
const wrongMessages = ['🤔 Fast!', '💭 Knapp daneben!', '🎯 Beim nächsten Mal!', '🎪 Gut probiert!', '🌈 Weiter so!', '🎨 Fast richtig!', '🎭 Nah dran!', '🎪 Üben macht den Meister!', '🎬 Nächstes Mal!', '🎸 Bleib dran!'];

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

async function joinGame() {
    initAudio();
    const name = document.getElementById('studentName').value.trim();
    const code = document.getElementById('joinCode').value.trim().toUpperCase();
    
    if (!name || !code) {
        alert('Bitte Namen und Spielcode eingeben!');
        return;
    }
    
    const gameSnapshot = await database.ref('games/' + code).once('value');
    if (!gameSnapshot.exists()) {
        alert('Spiel nicht gefunden! Bitte Code überprüfen.');
        return;
    }
    
    currentGameCode = code;
    currentPlayerId = 'player_' + Date.now();
    
    await database.ref('games/' + code + '/players/' + currentPlayerId).set({
        name: name,
        score: 0,
        correctAnswers: 0,
        joinedAt: Date.now()
    });
    
    document.getElementById('studentJoin').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'block';
    document.getElementById('currentGameCode').textContent = code;
    document.getElementById('currentPlayerName').textContent = name;
    
    database.ref('games/' + code).on('value', (snapshot) => {
        const game = snapshot.val();
        if (game.status === 'playing') {
            currentInstrument = game.instrument;
            displayStudentQuestion(game.currentQuestion);
        } else if (game.status === 'finished') {
            showStudentResults();
        }
    });
}

async function displayStudentQuestion(questionIndex) {
    const gameSnapshot = await database.ref('games/' + currentGameCode).once('value');
    const game = gameSnapshot.val();
    const question = game.questions[questionIndex];
    
    if (!question) return;
    
    hasAnswered = false;
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('studentQuestion').style.display = 'block';
    document.getElementById('studentQuestionNumber').textContent = questionIndex + 1;
    document.getElementById('studentNotation').textContent = question.notation;
    document.getElementById('studentFeedback').innerHTML = '';
    
    const cards = document.querySelectorAll('#studentQuestion .answer-card');
    cards.forEach(card => card.classList.remove('selected'));
    
    currentQuestionIndex = questionIndex;
}

async function selectAnswer(optionIndex) {
    if (hasAnswered) return;
    hasAnswered = true;
    
    const gameSnapshot = await database.ref('games/' + currentGameCode).once('value');
    const game = gameSnapshot.val();
    const question = game.questions[currentQuestionIndex];
    
    const isCorrect = optionIndex === question.correctIndex;
    
    const cards = document.querySelectorAll('#studentQuestion .answer-card');
    cards.forEach(card => card.classList.remove('selected'));
    cards[optionIndex].classList.add('selected');
    
    playRhythm(question.options[optionIndex].pattern);
    
    const feedback = document.getElementById('studentFeedback');
    if (isCorrect) {
        feedback.className = 'feedback correct';
        feedback.textContent = correctMessages[Math.floor(Math.random() * correctMessages.length)];
        
        const playerRef = database.ref('games/' + currentGameCode + '/players/' + currentPlayerId);
        const playerSnapshot = await playerRef.once('value');
        const playerData = playerSnapshot.val();
        
        await playerRef.update({
            score: (playerData.score || 0) + 10,
            correctAnswers: (playerData.correctAnswers || 0) + 1
        });
    } else {
        feedback.className = 'feedback wrong';
        feedback.textContent = wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
    }
    
    setTimeout(() => {
        document.getElementById('studentQuestion').style.display = 'none';
        document.getElementById('waitingScreen').style.display = 'block';
        document.getElementById('waitingText').textContent = 'Gleich geht es weiter...';
    }, 2500);
}

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

function showStudentResults() {
    document.getElementById('studentQuestion').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'none';
    
    database.ref('games/' + currentGameCode + '/players/' + currentPlayerId).once('value')
        .then((snapshot) => {
            const playerData = snapshot.val();
            const score = playerData.score || 0;
            const correct = playerData.correctAnswers || 0;
            
            const container = document.querySelector('.container');
            container.innerHTML = `
                <div class="result-card">
                    <h2>Dein Ergebnis</h2>
                    <h1>${score} Punkte</h1>
                    <p style="font-size: 1.5em;">${correct} richtig</p>
                    <button class="btn" onclick="location.reload()" style="margin-top: 30px;">
                        🔄 Nochmal spielen
                    </button>
                </div>
            `;
        });
}

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameCode = urlParams.get('game');
    if (gameCode) {
        document.getElementById('joinCode').value = gameCode;
    }
});
