// ===========================
// STUDENT.JS V3
// Rhythm Learning App - Student Side
// ===========================

// Firebase Configuration (MUSS IDENTISCH MIT TEACHER SEIN!)
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

// Global Variables
let gameCode = null;
let playerName = null;
let gameRef = null;
let currentQuestionIndex = 0;
let playerAnswers = [];
let audioContext = null;
let rhythmsDatabase = null;

// Firebase Listeners (for cleanup)
let statusListener = null;
let currentQuestionListener = null;

// Timer for speed bonus
let questionStartTime = null;
const MAX_TIME_FOR_BONUS = 10000; // 10 seconds for full bonus
const BASE_POINTS = 100;
const SPEED_BONUS_MAX = 50;

// Audio Configuration
const METRONOME_FREQUENCY = 1000; // Hz for metronome click
const NOISE_DURATION = 0.5; // seconds for pause noise (default)
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

// Motivational Phrases - erweitert und nach Leistung kategorisiert
const MOTIVATIONAL_PHRASES = {
    excellent: [
        "🔥 Unglaublich! Du bist ein Rhythmus-Genie!",
        "👑 Perfekt! Du rockst das komplett!",
        "⭐ Mega! Fast alle richtig - Wahnsinn!",
        "🎯 Fantastisch! Du bist on fire!",
        "💎 Outstanding! Rhythmus-Champion!"
    ],
    good: [
        "💪 Stark! Weiter so, das läuft super!",
        "🎸 Cool! Du machst das richtig gut!",
        "✨ Gut gemacht! Dran bleiben!",
        "🌟 Nice! Schon über die Hälfte richtig!",
        "🚀 Top! Du bist auf dem richtigen Weg!"
    ],
    medium: [
        "💡 Nicht schlecht! Noch ein bisschen üben!",
        "🎵 Okay! Du kommst da hin!",
        "📈 Geht voran! Bleib fokussiert!",
        "🎯 Solide! Weiter konzentrieren!",
        "⚡ Geht schon! Noch ein paar mehr!"
    ],
    needsWork: [
        "💪 Keine Sorge! Übung macht den Meister!",
        "🎓 Gut versucht! Beim nächsten Mal besser!",
        "🌱 Das wird! Weiter probieren!",
        "🔄 Learning by doing! Nicht aufgeben!",
        "💫 Jeder fängt mal an! Du schaffst das!"
    ]
};

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
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio Context initialized');
        } catch (error) {
            console.error('Failed to initialize Audio Context:', error);
            alert('Audio konnte nicht initialisiert werden. Bitte erlauben Sie Audio-Wiedergabe in Ihren Browser-Einstellungen.');
        }
    }
}

async function loadRhythmsDatabase() {
    try {
        // ⚠️ WICHTIG: HIER DEINE GITHUB-URL EINTRAGEN! ⚠️
        // Format: https://raw.githubusercontent.com/DEIN-USERNAME/DEIN-REPO/main/rhythms-database.json
        const response = await fetch('https://raw.githubusercontent.com/jonathanhoegg-ai/rhythmuslehrer-app/main/rhythms-database.json');
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
        cleanupListeners();
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

        // Check for duplicate names
        if (game.players) {
            const existingNames = Object.values(game.players).map(p => p.name.toLowerCase());
            if (existingNames.includes(playerName.toLowerCase())) {
                alert('Dieser Name ist bereits vergeben! Bitte wähle einen anderen Namen. 🙋');
                return;
            }
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
    // Clean up old listeners first
    cleanupListeners();
    
    // Listen for status changes
    statusListener = gameRef.child('status').on('value', (snapshot) => {
        const status = snapshot.val();
        
        if (status === 'playing') {
            loadGameQuestions();
        } else if (status === 'finished') {
            showResults();
            cleanupListeners(); // Clean up when game ends
        }
    });

    // Listen for current question changes
    currentQuestionListener = gameRef.child('currentQuestion').on('value', (snapshot) => {
        const questionIndex = snapshot.val();
        if (questionIndex !== null && questionIndex !== currentQuestionIndex) {
            currentQuestionIndex = questionIndex;
            showCurrentQuestion();
        }
    });
}

function cleanupListeners() {
    if (gameRef) {
        if (statusListener !== null) {
            gameRef.child('status').off('value', statusListener);
            statusListener = null;
        }
        if (currentQuestionListener !== null) {
            gameRef.child('currentQuestion').off('value', currentQuestionListener);
            currentQuestionListener = null;
        }
    }
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
        
        // Start timer for speed bonus
        questionStartTime = Date.now();
        
        // Display question number and notation
        document.getElementById('question-number').textContent = `Frage ${currentQuestionIndex + 1}`;
        document.getElementById('rhythm-notation').textContent = question.notation;

        // Reset answer buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.disabled = false;
            // Reset styling
            btn.style.border = '';
            btn.style.boxShadow = '';
            // Remove checkmarks
            const text = btn.innerHTML;
            btn.innerHTML = text.replace(' ✅', '').replace(' ❌', '');
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

async function selectAnswer(answerIndex) {
    const selectedAnswer = parseInt(answerIndex);
    // Save answer
    playerAnswers[currentQuestionIndex] = selectedAnswer;

    // Visual feedback - mark selected
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // Disable buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
    });

    // Submit answer to Firebase and get result
    const isCorrect = await submitAnswer(selectedAnswer);
    
    // Show immediate visual feedback
    const selectedBtn = event.target;
    if (isCorrect) {
        selectedBtn.style.border = '5px solid #4CAF50';
        selectedBtn.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.8)';
        selectedBtn.innerHTML += ' ✅';
    } else {
        selectedBtn.style.border = '5px solid #f44336';
        selectedBtn.style.boxShadow = '0 0 30px rgba(244, 67, 54, 0.8)';
        selectedBtn.innerHTML += ' ❌';
    }

    // Show intermediate screen with feedback after short delay
    setTimeout(async () => {
        await showIntermediateScreen();
    }, 1500);
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
        
        // Update player score in Firebase
        const playersSnapshot = await gameRef.child('players').once('value');
        const players = playersSnapshot.val();
        let playerKey = null;
        
        // Find player's key
        for (let key in players) {
            if (players[key].name === playerName) {
                playerKey = key;
                break;
            }
        }
        
        if (playerKey && isCorrect) {
            // Calculate speed bonus
            const timeElapsed = Date.now() - questionStartTime;
            let points = BASE_POINTS;
            
            if (timeElapsed < MAX_TIME_FOR_BONUS) {
                // Speed bonus: 50 points max for instant answer, decreases linearly
                const speedBonus = Math.round(SPEED_BONUS_MAX * (1 - timeElapsed / MAX_TIME_FOR_BONUS));
                points += speedBonus;
                console.log(`⚡ Speed bonus: +${speedBonus} points (answered in ${(timeElapsed/1000).toFixed(1)}s)`);
            }
            
            const currentScore = players[playerKey].score || 0;
            await gameRef.child('players/' + playerKey).update({
                score: currentScore + points,
                correctAnswers: (players[playerKey].correctAnswers || 0) + 1,
                lastAnswerPoints: points
            });
        }
        
        return isCorrect;

    } catch (error) {
        console.error('Error submitting answer:', error);
        return false;
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

async function showIntermediateScreen() {
    showScreen(intermediateScreen);

    try {
        // Calculate current stats ASYNCHRONOUSLY
        const answeredQuestions = playerAnswers.filter(a => a !== null).length;
        let correctAnswers = 0;
        
        // Count correct answers asynchronously
        for (let i = 0; i < playerAnswers.length; i++) {
            if (playerAnswers[i] !== null) {
                const isCorrect = await checkAnswerCorrectness(i, playerAnswers[i]);
                if (isCorrect) correctAnswers++;
            }
        }

        const percentCorrect = answeredQuestions > 0 
            ? Math.round((correctAnswers / answeredQuestions) * 100) 
            : 0;

        // Show if last answer was correct
        const lastAnswerCorrect = await checkAnswerCorrectness(currentQuestionIndex - 1, playerAnswers[currentQuestionIndex - 1]);
        
        const feedbackElement = document.getElementById('answer-feedback');
        if (lastAnswerCorrect) {
            feedbackElement.innerHTML = '✅ <strong>Richtig!</strong>';
            feedbackElement.style.color = '#43A047';
        } else {
            feedbackElement.innerHTML = '❌ <strong>Falsch!</strong>';
            feedbackElement.style.color = '#E53935';
        }

        // Get total questions
        const snapshot = await gameRef.child('questions').once('value');
        const totalQuestions = snapshot.numChildren();
        const remainingQuestions = totalQuestions - answeredQuestions;

        // Generate motivational message
        const motivationalText = generateMotivationalText(percentCorrect, remainingQuestions);
        document.getElementById('motivational-text').innerHTML = motivationalText;
    } catch (error) {
        console.error('Error showing intermediate screen:', error);
    }
}

function generateMotivationalText(percentCorrect, remainingQuestions) {
    // Wähle Kategorie basierend auf Performance
    let category;
    if (percentCorrect >= 80) {
        category = 'excellent';
    } else if (percentCorrect >= 60) {
        category = 'good';
    } else if (percentCorrect >= 40) {
        category = 'medium';
    } else {
        category = 'needsWork';
    }
    
    const phrases = MOTIVATIONAL_PHRASES[category];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    let message = `<strong style="font-size: 1.5em; color: #667eea;">${percentCorrect}% richtig!</strong><br><br>`;
    
    if (remainingQuestions > 0) {
        message += `Noch ${remainingQuestions} ${remainingQuestions === 1 ? 'Frage' : 'Fragen'} übrig.<br><br>`;
    } else {
        message += 'Letzte Frage geschafft!<br><br>';
    }
    
    message += `<span style="font-size: 1.3em;">${randomPhrase}</span>`;
    
    return message;
}

async function checkAnswerCorrectness(questionIndex, answerIndex) {
    try {
        const snapshot = await gameRef.child('questions/' + questionIndex).once('value');
        const question = snapshot.val();
        if (!question) return false;
        return answerIndex === question.correctAnswer;
    } catch (error) {
        console.error('Error checking answer correctness:', error);
        return false;
    }
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

    if (!audioContext) {
        console.error('Audio Context not available');
        return;
    }

    // Resume audio context if suspended (iOS Safari fix)
    try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('Audio Context resumed');
        }
    } catch (error) {
        console.error('Failed to resume Audio Context:', error);
        return;
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

    // Play the actual rhythm using pattern data
    const pattern = question.pattern || question.beats || [];
    if (pattern.length > 0) {
        pattern.forEach((duration, index) => {
            const absDuration = Math.abs(duration);
            if (duration < 0) {
                // PAUSEN: Weißes Rauschen spielen
                console.log(`🔇 Pause at beat ${index}, duration: ${absDuration} beats`);
                playPauseNoise(currentTime, absDuration * beatDuration);
            } else if (duration > 0) {
                // NOTEN: Instrument spielen
                console.log(`🎵 Note at beat ${index}, duration: ${duration} beats`);
                playBeat(duration, currentTime, question.instrument || 'Holzblock');
            }
            currentTime += absDuration * beatDuration;
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

function playPauseNoise(time, duration) {
    const actualDuration = duration || NOISE_DURATION;
    if (actualDuration < 0.01) {
        console.warn('Pause duration too short, skipped');
        return;
    }
    
    const bufferSize = Math.floor(audioContext.sampleRate * actualDuration);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Weißes Rauschen generieren - WICHTIG: DEUTLICH HÖRBAR
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15; // Erhöht auf 0.15 für bessere Hörbarkeit
    }

    const noise = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    noise.buffer = buffer;
    noise.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Lautstärke auf 0.25 für DEUTLICH hörbares Rauschen
    gainNode.gain.value = 0.25;

    noise.start(time);
    console.log(`✓ Pause noise played: ${actualDuration.toFixed(2)}s at gain 0.25`);
}

function playBeat(beatDuration, time, instrumentName) {
    const instrument = INSTRUMENTS[instrumentName] || INSTRUMENTS['Holzblock'];
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = instrument.frequency;
    oscillator.type = instrumentName === 'Becken' ? 'sawtooth' : 'sine';

    // Use instrument's natural duration, not beat duration
    const soundDuration = instrument.duration;
    gainNode.gain.setValueAtTime(0.6, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + soundDuration);

    oscillator.start(time);
    oscillator.stop(time + soundDuration);
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
