// ===========================
// STUDENT.JS V3
// Rhythm Learning App - Student Side
// ===========================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDLAxah2nlomC5yP35h9M-s73xrr9QCr3A",
    authDomain: "rhythmuslehrer.firebaseapp.com",
    databaseURL: "https://rhythmuslehrer-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "rhythmuslehrer",
    storageBucket: "rhythmuslehrer.firebasestorage.app",
    messagingSenderId: "673658087151",
    appId: "1:673658087151:web:0d4dfb46bf94e0dd896e1f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global Variables
let gameCode = null;
let playerName = null;
let gameRef = null;
let currentQuestionIndex = 0;
let playerAnswers = [];
let audioContext = null;
let rhythmsDatabase = null;

// Audio Configuration
const METRONOME_FREQUENCY = 1000; // Hz for metronome click
const NOISE_DURATION = 0.3; // seconds for pause noise
const INSTRUMENTS = {
    'Holzblock': { frequency: 800, duration: 0.1 },
    'Kuhglocke': { frequency: 600, duration: 0.15 },
    'Snare': { frequency: 200, duration: 0.08 },
    'Becken': { frequency: 1200, duration: 0.2 },
    'Conga': { frequency: 300, duration: 0.12 },
    'Claves': { frequency: 1000, duration: 0.06 }
};

// DOM Elements
const joinScreen = document.getElementById('join-screen');
const waitingScreen = document.getElementById('waiting-screen');
const questionScreen = document.getElementById('question-screen');
const intermediateScreen = document.getElementById('intermediate-screen');
const resultsScreen = document.getElementById('results-screen');

// Motivational Phrases
const MOTIVATIONAL_PHRASES = [
    "Stark! Weiter so! 💪",
    "Du rockst das! 🎸",
    "Mega Fortschritt! 🔥",
    "Fast geschafft! 🎯",
    "Dran bleiben, läuft! ✨",
    "Top Performance! 🌟",
    "Rhythmus-King/Queen! 👑",
    "Noch ein paar Steps! 🚀",
    "Richtig smooth! 🎵",
    "Keep going! 💯"
];

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Check for game code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameCode = urlParams.get('game');
    
    if (urlGameCode) {
        document.getElementById('game-code').value = urlGameCode.toUpperCase();
    }

    // Initialize Audio Context on first user interaction
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchstart', initAudioContext, { once: true });

    // Load Rhythms Database
    loadRhythmsDatabase();

    // Setup Event Listeners
    setupEventListeners();
});

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio Context initialized');
    }
}

async function loadRhythmsDatabase() {
    try {
        // ⚠️ WICHTIG: HIER DEINE GITHUB-URL EINTRAGEN! ⚠️
        // Format: https://raw.githubusercontent.com/jonathanhoegg-ai/rhythmuslehrer-app/main/rhythms-database.json
        const response = await fetch('https://raw.githubusercontent.com/jonathanhoegg-ai/main/rhythms-database.json');
        if (!response.ok) throw new Error('Failed to load rhythms database');
        rhythmsDatabase = await response.json();
        console.log('Rhythms database loaded:', rhythmsDatabase);
    } catch (error) {
        console.error('Error loading rhythms database:', error);
        // Fallback to basic rhythms if database fails to load
        rhythmsDatabase = createFallbackDatabase();
    }
}

function createFallbackDatabase() {
    return {
        "4/4": {
            "beginner": {
                "no_pause": [
                    { notation: "4/4 |♩♩♩♩|", beats: ["quarter", "quarter", "quarter", "quarter"] }
                ],
                "with_pause": [
                    { notation: "4/4 |♩𝄽♩𝄽|", beats: ["quarter", "rest", "quarter", "rest"] }
                ]
            }
        }
    };
}

function setupEventListeners() {
    // Join Game Button
    document.getElementById('join-btn').addEventListener('click', joinGame);

    // Answer Buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => selectAnswer(e.target.dataset.answer));
    });

    // Continue Button on Intermediate Screen
    document.getElementById('continue-btn').addEventListener('click', showNextQuestion);

    // Back to Menu Button on Results Screen
    document.getElementById('back-menu-btn').addEventListener('click', () => {
        location.reload();
    });

    // Enter key to join
    document.getElementById('player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    document.getElementById('game-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
}

// ===========================
// GAME JOINING
// ===========================

async function joinGame() {
    const nameInput = document.getElementById('player-name');
    const codeInput = document.getElementById('game-code');
    
    playerName = nameInput.value.trim();
    gameCode = codeInput.value.trim().toUpperCase();

    if (!playerName || !gameCode) {
        alert('Bitte Namen und Spielcode eingeben! 📝');
        return;
    }

    // Check if game exists
    gameRef = database.ref('games/' + gameCode);
    
    try {
        const snapshot = await gameRef.once('value');
        const game = snapshot.val();

        if (!game) {
            alert('Spielcode nicht gefunden! 🔍');
            return;
        }

        if (game.status !== 'waiting') {
            alert('Spiel hat bereits begonnen oder ist beendet! ⏰');
            return;
        }

        // Add player to game
        const playersRef = gameRef.child('players');
        await playersRef.push({
            name: playerName,
            joinedAt: Date.now()
        });

        // Switch to waiting screen
        showScreen(waitingScreen);
        document.getElementById('waiting-player-name').textContent = playerName;
        document.getElementById('waiting-game-code').textContent = gameCode;

        // Listen for game start
        listenForGameStart();

    } catch (error) {
        console.error('Error joining game:', error);
        alert('Fehler beim Beitreten! 😕');
    }
}

function listenForGameStart() {
    gameRef.child('status').on('value', (snapshot) => {
        const status = snapshot.val();
        
        if (status === 'playing') {
            loadGameQuestions();
        } else if (status === 'finished') {
            showResults();
        }
    });

    // Listen for current question changes
    gameRef.child('currentQuestion').on('value', (snapshot) => {
        const questionIndex = snapshot.val();
        if (questionIndex !== null && questionIndex !== currentQuestionIndex) {
            currentQuestionIndex = questionIndex;
            showCurrentQuestion();
        }
    });
}

// ===========================
// GAME PLAYING
// ===========================

async function loadGameQuestions() {
    try {
        const snapshot = await gameRef.once('value');
        const game = snapshot.val();
        
        if (!game || !game.questions) {
            console.error('No questions found in game');
            return;
        }

        currentQuestionIndex = game.currentQuestion || 0;
        playerAnswers = new Array(game.questions.length).fill(null);
        
        showCurrentQuestion();
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

async function showCurrentQuestion() {
    try {
        const snapshot = await gameRef.child('questions/' + currentQuestionIndex).once('value');
        const question = snapshot.val();

        if (!question) {
            console.error('Question not found');
            return;
        }

        showScreen(questionScreen);
        
        // Display question number and notation
        document.getElementById('question-number').textContent = `Frage ${currentQuestionIndex + 1}`;
        document.getElementById('rhythm-notation').textContent = question.notation;

        // Reset answer buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.disabled = false;
        });

        // Play rhythm with metronome
        if (question.correctAnswer !== undefined) {
            setTimeout(() => {
                playRhythmWithMetronome(question);
            }, 500);
        }

    } catch (error) {
        console.error('Error showing question:', error);
    }
}

function selectAnswer(answerIndex) {
    // Save answer
    playerAnswers[currentQuestionIndex] = parseInt(answerIndex);

    // Visual feedback
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // Disable buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
    });

    // Submit answer to Firebase
    submitAnswer(parseInt(answerIndex));

    // Wait for teacher to proceed or auto-advance after delay
    setTimeout(() => {
        checkForNextQuestion();
    }, 2000);
}

async function submitAnswer(answerIndex) {
    try {
        const snapshot = await gameRef.child('questions/' + currentQuestionIndex).once('value');
        const question = snapshot.val();
        
        const isCorrect = (answerIndex === question.correctAnswer);

        // Save answer to Firebase
        const answersRef = gameRef.child('answers/' + playerName);
        await answersRef.child(currentQuestionIndex.toString()).set({
            answer: answerIndex,
            correct: isCorrect,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error submitting answer:', error);
    }
}

async function checkForNextQuestion() {
    try {
        const snapshot = await gameRef.child('currentQuestion').once('value');
        const serverQuestion = snapshot.val();

        if (serverQuestion > currentQuestionIndex) {
            currentQuestionIndex = serverQuestion;
            showIntermediateScreen();
        }
    } catch (error) {
        console.error('Error checking next question:', error);
    }
}

function showIntermediateScreen() {
    showScreen(intermediateScreen);

    // Calculate current stats
    const answeredQuestions = playerAnswers.filter(a => a !== null).length;
    const correctAnswers = playerAnswers.filter((a, i) => {
        return a !== null && checkAnswerCorrectness(i, a);
    }).length;

    const percentCorrect = answeredQuestions > 0 
        ? Math.round((correctAnswers / answeredQuestions) * 100) 
        : 0;

    // Show if last answer was correct
    const lastAnswerCorrect = checkAnswerCorrectness(currentQuestionIndex - 1, playerAnswers[currentQuestionIndex - 1]);
    
    const feedbackElement = document.getElementById('answer-feedback');
    if (lastAnswerCorrect) {
        feedbackElement.innerHTML = '✅ <strong>Richtig!</strong>';
        feedbackElement.style.color = '#43A047';
    } else {
        feedbackElement.innerHTML = '❌ <strong>Falsch!</strong>';
        feedbackElement.style.color = '#E53935';
    }

    // Get total questions
    gameRef.child('questions').once('value', (snapshot) => {
        const totalQuestions = snapshot.numChildren();
        const remainingQuestions = totalQuestions - answeredQuestions;

        // Generate motivational message
        const motivationalText = generateMotivationalText(percentCorrect, remainingQuestions);
        document.getElementById('motivational-text').textContent = motivationalText;
    });
}

function generateMotivationalText(percentCorrect, remainingQuestions) {
    const randomPhrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];
    
    let message = `${percentCorrect}% richtig! `;
    
    if (remainingQuestions > 0) {
        message += `Noch ${remainingQuestions} ${remainingQuestions === 1 ? 'Übung' : 'Übungen'}. `;
    } else {
        message += 'Letzte Frage geschafft! ';
    }
    
    message += randomPhrase;
    
    return message;
}

function checkAnswerCorrectness(questionIndex, answerIndex) {
    // This would need to fetch the correct answer from Firebase
    // For now, we'll implement a simplified version
    return Math.random() > 0.5; // Placeholder
}

function showNextQuestion() {
    const totalQuestionsPromise = gameRef.child('questions').once('value');
    
    totalQuestionsPromise.then(snapshot => {
        const totalQuestions = snapshot.numChildren();
        
        if (currentQuestionIndex < totalQuestions) {
            showCurrentQuestion();
        } else {
            showResults();
        }
    });
}

// ===========================
// RESULTS
// ===========================

async function showResults() {
    showScreen(resultsScreen);

    try {
        // Get all questions to check answers
        const questionsSnapshot = await gameRef.child('questions').once('value');
        const questions = questionsSnapshot.val();
        const totalQuestions = Object.keys(questions).length;

        // Calculate score
        let correctCount = 0;
        Object.keys(questions).forEach((key, index) => {
            const question = questions[key];
            if (playerAnswers[index] === question.correctAnswer) {
                correctCount++;
            }
        });

        const percentage = Math.round((correctCount / totalQuestions) * 100);

        // Display results
        document.getElementById('final-score').textContent = 
            `${correctCount} / ${totalQuestions} richtig (${percentage}%)`;

        // Motivational final message
        let finalMessage = '';
        if (percentage >= 90) {
            finalMessage = '🏆 Rhythmus-Champion! Absolute Topklasse!';
        } else if (percentage >= 75) {
            finalMessage = '⭐ Mega gut! Fast perfekt!';
        } else if (percentage >= 50) {
            finalMessage = '💪 Solide Performance! Weiter üben!';
        } else {
            finalMessage = '🎵 Guter Start! Übung macht den Meister!';
        }

        document.getElementById('final-message').textContent = finalMessage;

    } catch (error) {
        console.error('Error showing results:', error);
    }
}

// ===========================
// AUDIO PLAYBACK
// ===========================

async function playRhythmWithMetronome(question) {
    if (!audioContext) {
        initAudioContext();
    }

    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const timeSignature = question.timeSignature || '4/4';
    const [beatsPerMeasure] = timeSignature.split('/').map(Number);
    const tempo = question.tempo || 120;
    const beatDuration = 60 / tempo;

    let currentTime = audioContext.currentTime + 0.1;

    // Play metronome count-in (1 measure)
    for (let i = 0; i < beatsPerMeasure; i++) {
        playMetronomeClick(currentTime, i === 0); // First beat emphasized
        currentTime += beatDuration;
    }

    // Add small pause after metronome
    currentTime += beatDuration * 0.5;

    // Play the actual rhythm
    if (question.beats) {
        question.beats.forEach((beat, index) => {
            if (beat === 'rest' || beat === 'pause') {
                playPauseNoise(currentTime);
            } else {
                playBeat(beat, currentTime, question.instrument || 'Holzblock');
            }
            currentTime += beatDuration;
        });
    }
}

function playMetronomeClick(time, emphasized = false) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = emphasized ? METRONOME_FREQUENCY * 1.5 : METRONOME_FREQUENCY;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(emphasized ? 0.3 : 0.2, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    oscillator.start(time);
    oscillator.stop(time + 0.05);
}

function playPauseNoise(time) {
    const bufferSize = audioContext.sampleRate * NOISE_DURATION;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate very quiet white noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.05; // Very low volume
    }

    const noise = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    noise.buffer = buffer;
    noise.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.value = 0.1; // Quiet

    noise.start(time);
}

function playBeat(beatType, time, instrumentName) {
    const instrument = INSTRUMENTS[instrumentName] || INSTRUMENTS['Holzblock'];
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = instrument.frequency;
    oscillator.type = instrumentName === 'Becken' ? 'sawtooth' : 'sine';

    const duration = instrument.duration;
    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

    oscillator.start(time);
    oscillator.stop(time + duration);
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function showScreen(screen) {
    [joinScreen, waitingScreen, questionScreen, intermediateScreen, resultsScreen].forEach(s => {
        s.classList.remove('active');
    });
    screen.classList.add('active');
}
