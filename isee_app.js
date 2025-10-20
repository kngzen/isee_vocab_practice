// isee_app.js - Main application logic for ISEE Vocabulary Quiz
// Enhanced version with multiple word list support

// ===== Analytics Configuration =====
const ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbyjRS0VdCBzHQ7LMKTvxWVL3iQ1aVJAxqZuYVtrFC9ggEaC6UufYUsZtZmidx91FM6t/exec';
const SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let quizStartTime = null;
let userIP = null;
let selectedUser = null;
let selectedWordList = null;

// ===== Audio System =====
let audioContext = null;
let audioInitialized = false;

// Detect Safari
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Initialize audio context (must be done after user interaction)
async function initAudio() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Audio context created, state:', audioContext.state);
      
      // Safari requires explicit resume with async/await
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('Audio context resumed, new state:', audioContext.state);
      }
      
      audioInitialized = true;
      console.log('Audio successfully initialized');
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
      return null;
    }
  }
  return audioContext;
}

// Test if audio is actually working by playing a silent tone
async function testAudio() {
  const ctx = await initAudio();
  if (!ctx || ctx.state !== 'running') return false;
  
  try {
    // Create a very brief, nearly silent test tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime); // Very quiet
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.01); // Very brief
    
    console.log('Audio test completed successfully');
    return true;
  } catch (error) {
    console.warn('Audio test failed:', error);
    return false;
  }
}

// Safari-compatible tone generator with enhanced error handling
async function playTone(frequency, duration, type = 'sine', volume = 0.1) {
  const ctx = await initAudio();
  if (!ctx || ctx.state !== 'running') {
    console.warn('Audio context not available or not running');
    return;
  }

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Create audio graph
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Set oscillator properties
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    // Safari-friendly gain envelope - avoid exponential curves
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + duration * 0.7);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    
    // Start and stop oscillator
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
    
    console.log(`Playing tone: ${frequency}Hz for ${duration}s`);
    
    // Clean up for Safari
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  } catch (error) {
    console.error('Error playing tone:', error);
  }
}

// Success sound - gentle ascending chime
async function playSuccessSound() {
  console.log('Attempting to play success sound...');
  try {
    await playTone(523.25, 0.15, 'sine', 0.1); // C5
    setTimeout(async () => await playTone(659.25, 0.15, 'sine', 0.08), 80); // E5
  } catch (e) {
    console.error('Success sound failed:', e);
  }
}

// Error sound - gentle descending tone
async function playErrorSound() {
  console.log('Attempting to play error sound...');
  try {
    await playTone(311.13, 0.2, 'sine', 0.08); // Eb4
    setTimeout(async () => await playTone(246.94, 0.25, 'sine', 0.06), 100); // B3
  } catch (e) {
    console.error('Error sound failed:', e);
  }
}

// Build sound - single confident tone (initializes audio)
async function playBuildSound() {
  console.log('Build button clicked - initializing audio...');
  
  try {
    // Force audio initialization
    await initAudio();
    
    // Test audio first
    const audioWorking = await testAudio();
    console.log('Audio test result:', audioWorking);
    
    if (audioWorking) {
      // Small delay for Safari
      setTimeout(async () => {
        await playTone(440, 0.12, 'sine', 0.1); // A4
      }, isSafari ? 100 : 0);
    } else {
      console.warn('Audio test failed - skipping build sound');
    }
  } catch (e) {
    console.error('Build sound failed:', e);
  }
}

// Celebration sound - cheerful ascending sequence
async function playCelebrationSound() {
  console.log('Attempting to play celebration sound...');
  if (!audioInitialized || !audioContext || audioContext.state !== 'running') {
    console.warn('Audio not ready for celebration sound');
    return;
  }
  
  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(async () => {
        await playTone(freq, 0.3, 'sine', 0.1);
      }, i * 150);
    });
  } catch (e) {
    console.error('Celebration sound failed:', e);
  }
}

// Get user's IP address
async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not fetch IP address:', error);
    return 'unknown';
  }
}

// Initialize IP on page load
getUserIP().then(ip => {
  userIP = ip;
});

// ===== Analytics Functions =====
function sendAnalytics(eventData) {
  if (!ANALYTICS_URL || ANALYTICS_URL.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
    console.log('Analytics not configured. Event:', eventData);
    return;
  }

  // Build URL parameters - wordList is added at the end to be the last column
  const params = new URLSearchParams({
    event: eventData.event,
    sessionId: SESSION_ID,
    user: selectedUser || 'unknown',
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    ipAddress: userIP || 'unknown',
    timestamp: new Date().toISOString(),
    ...eventData,
    wordList: selectedWordList || 'unknown'  // Add wordList last for Google Sheets
  });

  const url = ANALYTICS_URL + '?' + params.toString();
  console.log('Sending analytics via GET:', url);
  console.log('Selected user:', selectedUser);
  console.log('Selected word list:', selectedWordList);
  console.log('Full params:', Object.fromEntries(params));

  fetch(url, {
    method: 'GET'
  })
  .then(response => {
    console.log('Analytics response status:', response.status);
    return response.text();
  })
  .then(text => {
    console.log('Analytics response:', text);
  })
  .catch(error => {
    console.error('Analytics error:', error);
  });
}

function trackQuizStart(numQuestions, shuffleChoices) {
  quizStartTime = Date.now();
  sendAnalytics({
    event: 'quiz_start',
    numQuestions: numQuestions,
    shuffleChoices: shuffleChoices
  });
}

function trackQuestionAnswer(questionNumber, word, correct, selectedAnswer, correctAnswer) {
  sendAnalytics({
    event: 'question_answer',
    questionNumber: questionNumber,
    word: word,
    correct: correct,
    selectedAnswer: selectedAnswer,
    correctAnswer: correctAnswer
  });
}

function trackQuizComplete(numQuestions, shuffleChoices, score, accuracy) {
  const timeSpent = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
  sendAnalytics({
    event: 'quiz_complete',
    numQuestions: numQuestions,
    shuffleChoices: shuffleChoices,
    score: score,
    accuracy: accuracy,
    timeSpent: timeSpent,
    questionsAnswered: numQuestions
  });
}

// ===== Word List Data Management =====
function getWordListData(listName) {
  const wordLists = {
    original: {
      definitions: window.DEFINITIONS || {},
      questions: window.QUESTIONS || []
    },
    enhanced1: {
      definitions: window.DEFINITIONS_ENHANCED1 || {},
      questions: window.QUESTIONS_ENHANCED1 || []
    },
    enhanced2: {
      definitions: window.DEFINITIONS_ENHANCED2 || {},
      questions: window.QUESTIONS_ENHANCED2 || []
    }
  };
  
  return wordLists[listName] || wordLists.original;
}

function getWordListDisplayName(listName) {
  const displayNames = {
    original: 'Original (Standard)',
    enhanced1: 'Enhanced Set 1 (Standard)',
    enhanced2: 'Enhanced Set 2 (Advanced)'
  };
  return displayNames[listName] || listName;
}

// ===== Utilities =====
const app = document.getElementById('appRoot');
const $ = (sel) => app.querySelector(sel);
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ===== Elements (scoped to appRoot) =====
const userSel = $("#userSel");
const wordListSel = $("#wordListSel");
const subsetSel = $("#subsetSel");
const statusEl = $("#status");
const quizSection = $("#quizSection");
const summarySection = $("#summarySection");
const incorrectPanel = $("#incorrectPanel");
const incorrectList = $("#incorrectList");

const qMeta = $("#qMeta");
const qWord = $("#qWord");
const choicesEl = $("#choices");
const feedbackEl = $("#feedback");
const progressEl = $("#progress");
const scorePill = $("#scorePill");
const qIdPill = $("#qIdPill");
const buildBtn = $("#buildBtn");
const submitBtn = $("#submitBtn");
const nextBtn = $("#nextBtn");
const sumTotal = $("#sumTotal");
const sumCorrect = $("#sumCorrect");
const sumIncorrect = $("#sumIncorrect");
const sumAcc = $("#sumAcc");

// Graphical score
const barCorrect = $("#barCorrect");
const barIncorrect = $("#barIncorrect");
const cntCorrect = $("#cntCorrect");
const cntIncorrect = $("#cntIncorrect");
const confettiCanvas = document.getElementById("confettiCanvas");
const celebrationBadge = document.getElementById("celebrationBadge");

// ===== State =====
let QUIZ = [];
let CURRENT_DEFINITIONS = {};
let idx = 0;
let score = 0;
let answered = new Map();   // number -> { selected, correct }
let choiceOrder = {};       // number -> ['A','B','C','D']

// ===== User and Word List Selection Logic =====
function updateSelections() {
  selectedUser = userSel.value;
  selectedWordList = wordListSel.value;
  
  const userSelected = !!selectedUser;
  const wordListSelected = !!selectedWordList;
  
  if (userSelected && wordListSelected) {
    const listDisplay = getWordListDisplayName(selectedWordList);
    statusEl.innerHTML = `<span class="good">User: ${selectedUser} | Word List: ${listDisplay}. Ready to build quiz.</span>`;
    buildBtn.disabled = false;
  } else if (userSelected && !wordListSelected) {
    statusEl.innerHTML = `<span class="warn">User: ${selectedUser}. Please select a word list.</span>`;
    buildBtn.disabled = true;
  } else if (!userSelected && wordListSelected) {
    const listDisplay = getWordListDisplayName(selectedWordList);
    statusEl.innerHTML = `<span class="warn">Word List: ${listDisplay}. Please select a user.</span>`;
    buildBtn.disabled = true;
  } else {
    statusEl.innerHTML = 'Ready. Please select a user and word list first.';
    buildBtn.disabled = true;
  }
}

// ===== Score UI =====
function updateScoreUI() {
  const totalDone = answered.size;
  const correctSoFar = Array.from(answered.values()).filter(a => a.correct).length;
  const incorrectSoFar = totalDone - correctSoFar;

  const total = QUIZ.length || 1;
  const pCorrect = (correctSoFar / total) * 100;
  const pIncorrect = (incorrectSoFar / total) * 100;

  barCorrect.style.width = pCorrect + "%";
  barIncorrect.style.width = pIncorrect + "%";
  barIncorrect.style.left = pCorrect + "%";

  cntCorrect.textContent = correctSoFar;
  cntIncorrect.textContent = incorrectSoFar;
}

// ===== Definition Display Helper =====
function createDefinitionElement(word, correct = false) {
  const defRaw = (CURRENT_DEFINITIONS[word] || CURRENT_DEFINITIONS[word?.toUpperCase()] || "").trim?.() || "";
  
  if (!defRaw) return null;

  const defNode = document.createElement("div");
  defNode.className = "hint def-example";

  // Split on em dash "—" Example:"
  const parts = defRaw.split(/—\s*Example:\s*/i);
  if (parts.length === 2) {
    const baseDef = parts[0];
    const example = parts[1];

    // Highlight base word and simple variants
    const base = String(word || "").toLowerCase();
    const highlightedExample = example.replace(
      new RegExp(`\\b(${base}\\w*)\\b`, "gi"),
      '<mark>$1</mark>'
    );

    defNode.innerHTML = `Definition: ${baseDef} — Example: ${highlightedExample}`;
  } else {
    // Fallback if Example portion not present
    defNode.textContent = `Definition: ${defRaw}`;
  }

  return defNode;
}

// ===== Celebration =====
function launchCelebration(durationMs = 5000) {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = "block";
  celebrationBadge.style.display = "grid";

  const ctx = confettiCanvas.getContext("2d");
  
  // Randomly choose animation type: 0 = confetti, 1 = carrots, 2 = cows
  const animationType = Math.floor(Math.random() * 3);
  
  let pieces;
  
  if (animationType === 0) {
    // Traditional confetti
    const colors = ["#ff5a5f","#ffb703","#03d387","#1b6bff","#9b5de5","#00bbf9"];
    pieces = Array.from({length: 200}, () => ({
      type: 'confetti',
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      r: 5 + Math.random() * 7,
      c: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3.5,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4
    }));
  } else if (animationType === 1) {
    // Carrots
    pieces = Array.from({length: 100}, () => ({
      type: 'carrot',
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      size: 20 + Math.random() * 20,
      vy: 2 + Math.random() * 3,
      vx: -0.5 + Math.random() * 1,
      rot: Math.random() * Math.PI * 2,
      vr: -0.1 + Math.random() * 0.2
    }));
  } else {
    // Cows
    pieces = Array.from({length: 100}, () => ({
      type: 'cow',
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      size: 25 + Math.random() * 25,
      vy: 2 + Math.random() * 3,
      vx: -0.5 + Math.random() * 1,
      rot: Math.random() * Math.PI * 2,
      vr: -0.1 + Math.random() * 0.2
    }));
  }

  function drawCarrot(ctx, size) {
    // Draw carrot body (orange triangle, point down)
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.moveTo(0, size * 0.6);  // Point at bottom
    ctx.lineTo(-size * 0.3, -size * 0.4);  // Left side of wide top
    ctx.lineTo(size * 0.3, -size * 0.4);  // Right side of wide top
    ctx.closePath();
    ctx.fill();
    
    // Draw carrot top (green leaves) at the wide end
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, -size * 0.5);
    ctx.lineTo(-size * 0.3, -size * 0.8);
    ctx.lineTo(-size * 0.1, -size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(0, -size * 0.9);
    ctx.lineTo(size * 0.1, -size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(size * 0.2, -size * 0.5);
    ctx.lineTo(size * 0.3, -size * 0.8);
    ctx.lineTo(size * 0.1, -size * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  
  function drawCow(ctx, size) {
    // Draw cow body (white rounded rectangle)
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = size * 0.04;
    ctx.beginPath();
    ctx.roundRect(-size * 0.5, -size * 0.2, size, size * 0.6, size * 0.15);
    ctx.fill();
    ctx.stroke();
    
    // Draw black spots
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(-size * 0.25, -size * 0.05, size * 0.12, size * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(size * 0.15, 0.1, size * 0.15, size * 0.1, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(size * 0.25, -size * 0.15, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw head (white circle)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-size * 0.5, -size * 0.35, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw pink snout
    ctx.fillStyle = "#ffb3ba";
    ctx.beginPath();
    ctx.ellipse(-size * 0.5, -size * 0.3, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw nostrils
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(-size * 0.55, -size * 0.3, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-size * 0.45, -size * 0.3, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.beginPath();
    ctx.arc(-size * 0.55, -size * 0.42, size * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-size * 0.45, -size * 0.42, size * 0.03, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw ears (pink inside)
    ctx.fillStyle = "#ffb3ba";
    ctx.beginPath();
    ctx.ellipse(-size * 0.65, -size * 0.5, size * 0.08, size * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(-size * 0.35, -size * 0.5, size * 0.08, size * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw legs (white rectangles)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-size * 0.35, size * 0.35, size * 0.12, size * 0.15);
    ctx.strokeRect(-size * 0.35, size * 0.35, size * 0.12, size * 0.15);
    
    ctx.fillRect(-size * 0.1, size * 0.35, size * 0.12, size * 0.15);
    ctx.strokeRect(-size * 0.1, size * 0.35, size * 0.12, size * 0.15);
    
    ctx.fillRect(size * 0.15, size * 0.35, size * 0.12, size * 0.15);
    ctx.strokeRect(size * 0.15, size * 0.35, size * 0.12, size * 0.15);
    
    ctx.fillRect(size * 0.35, size * 0.35, size * 0.12, size * 0.15);
    ctx.strokeRect(size * 0.35, size * 0.35, size * 0.12, size * 0.15);
    
    // Draw hooves (black)
    ctx.fillStyle = "#000000";
    ctx.fillRect(-size * 0.35, size * 0.48, size * 0.12, size * 0.04);
    ctx.fillRect(-size * 0.1, size * 0.48, size * 0.12, size * 0.04);
    ctx.fillRect(size * 0.15, size * 0.48, size * 0.12, size * 0.04);
    ctx.fillRect(size * 0.35, size * 0.48, size * 0.12, size * 0.04);
  }

  function resize() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  let confettiTimer;
  function draw() {
    const w = confettiCanvas.width, h = confettiCanvas.height;
    ctx.clearRect(0, 0, w, h);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > h + 50) { p.y = -50; p.x = Math.random() * w; }
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      
      if (p.type === 'confetti') {
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
      } else if (p.type === 'carrot') {
        drawCarrot(ctx, p.size);
      } else if (p.type === 'cow') {
        drawCow(ctx, p.size);
      }
      
      ctx.restore();
    });
    confettiTimer = requestAnimationFrame(draw);
  }
  draw();

  setTimeout(() => {
    cancelAnimationFrame(confettiTimer);
    confettiCanvas.style.display = "none";
    celebrationBadge.style.display = "none";
  }, durationMs);

  window.addEventListener("resize", resize, { once: true });
}

// ===== Core logic =====
function buildQuiz() {
  // Stop and clear any running celebration animation
  if (confettiCanvas) {
    confettiCanvas.style.display = "none";
  }
  if (celebrationBadge) {
    celebrationBadge.style.display = "none";
  }
  
  // Check if user and word list are selected
  if (!selectedUser) {
    statusEl.innerHTML = '<span class="bad">Please select a user first.</span>';
    return;
  }
  
  if (!selectedWordList) {
    statusEl.innerHTML = '<span class="bad">Please select a word list first.</span>';
    return;
  }

  // Get the selected word list data
  const wordListData = getWordListData(selectedWordList);
  const questions = wordListData.questions;
  CURRENT_DEFINITIONS = wordListData.definitions;

  // Validate that questions are available
  if (!Array.isArray(questions) || !questions.length) {
    statusEl.innerHTML = `<span class="bad">No questions found for the selected word list. Please ensure the data file is loaded correctly.</span>`;
    return;
  }

  // Play build sound
  playBuildSound();

  const size = parseInt(subsetSel.value, 10) || 300;
  const shuffleChoices = $("#shuffleChoices").checked;

  const pool = questions.slice();
  shuffle(pool);
  QUIZ = pool.slice(0, Math.min(size, pool.length));

  idx = 0; score = 0; answered.clear(); choiceOrder = {};
  quizSection.style.display = "";
  summarySection.style.display = "none";
  incorrectPanel.style.display = "none";
  incorrectList.innerHTML = "";

  const picked = QUIZ.length;
  const total = questions.length;
  const listDisplay = getWordListDisplayName(selectedWordList);
  statusEl.innerHTML = `<span class="good">User: ${selectedUser} | Word List: ${listDisplay}. Using ${picked} question(s) out of ${total}. Randomized order.</span>`;

  // Track quiz start
  trackQuizStart(picked, shuffleChoices);

  renderQuestion();
}

function renderQuestion() {
  const total = QUIZ.length;
  if (idx < 0) idx = 0;
  if (idx >= total) { showSummary(); return; }

  const q = QUIZ[idx];
  progressEl.textContent = `${idx + 1} / ${total}`;
  scorePill.textContent = `Score: ${score}`;
  qMeta.textContent = `Question ${q.number}`;
  qWord.textContent = `${q.word}`;
  qIdPill.textContent = `ID: ${q.number}`;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  // Hide Next until submit unless already answered
  nextBtn.style.display = "none";

  // Stable per-question order; optionally shuffle
  const letters = ['A','B','C','D'];
  const doShuffleChoices = $("#shuffleChoices").checked;
  let order = choiceOrder[q.number];
  if (!order) {
    order = letters.slice();
    if (doShuffleChoices) shuffle(order);
    choiceOrder[q.number] = order;
  }

  // Render choices
  choicesEl.innerHTML = "";
  order.forEach(letter => {
    const wrap = document.createElement("label");
    wrap.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "choice";
    input.value = letter;
    input.setAttribute("aria-label", `${letter}) ${q.choices[letter]}`);
    const text = document.createElement("span");
    text.textContent = `${letter}) ${q.choices[letter]}`;
    wrap.appendChild(input);
    wrap.appendChild(text);
    choicesEl.appendChild(wrap);
  });

  // If already answered earlier, show nav and keep Submit hidden
  if (answered.has(q.number)) {
    submitBtn.style.display = "none";
    nextBtn.style.display = "";

    // Keep the prior selection visible and disable all radios
    const prev = answered.get(q.number);
    Array.from(choicesEl.querySelectorAll('input[name="choice"]')).forEach(i => {
      i.checked = (i.value === prev.selected);
      i.disabled = true;
    });

    // Re-apply choice outlines for correct/incorrect visual
    Array.from(choicesEl.querySelectorAll('.choice')).forEach(label => {
      const input = label.querySelector('input');
      label.style.outline = '';
      if (input.value === q.answer) label.style.outline = `3px solid var(--accent-green)`;
      if (input.value === prev.selected && prev.selected !== q.answer) label.style.outline = `3px solid var(--accent-red)`;
    });

    // Show feedback and definition for previously answered questions
    feedbackEl.className = "feedback " + (prev.correct ? "correct" : "incorrect");
    if (prev.correct) {
      feedbackEl.textContent = "Correct!";
    } else {
      const correctText = q.choices[q.answer];
      feedbackEl.innerHTML = `Incorrect. Correct answer: ${q.answer}) ${correctText}`;
    }

    // Show definition for previously answered questions
    const defElement = createDefinitionElement(q.word, prev.correct);
    if (defElement) {
      feedbackEl.appendChild(defElement);
    }
  } else {
    submitBtn.style.display = "";
  }

  updateScoreUI();
}

function submitCurrent() {
  if (!QUIZ.length) return;

  const q = QUIZ[idx];
  const selected = Array.from(app.querySelectorAll('input[name="choice"]')).find(i => i.checked)?.value;
  if (!selected) {
    feedbackEl.textContent = "Please select an answer.";
    feedbackEl.className = "feedback incorrect";
    return;
  }
  const correct = (selected === q.answer);
  if (!answered.has(q.number)) {
    answered.set(q.number, { selected, correct });
    if (correct) score++;
    
    // Track question answer
    // trackQuestionAnswer(q.number, q.word, correct, selected, q.answer);
  }

  feedbackEl.className = "feedback " + (correct ? "correct" : "incorrect");
  if (correct) {
    feedbackEl.textContent = "Correct!";
    playSuccessSound();
  } else {
    const correctText = q.choices[q.answer];
    feedbackEl.innerHTML = `Incorrect. Correct answer: ${q.answer}) ${correctText}`;
    playErrorSound();
  }

  // Always append definition (whether correct or incorrect)
  const defElement = createDefinitionElement(q.word, correct);
  if (defElement) {
    feedbackEl.appendChild(defElement);
  }

  // Highlight choice outlines
  Array.from(choicesEl.querySelectorAll('.choice')).forEach(label => {
    const input = label.querySelector('input');
    label.style.outline = '';
    if (input.value === q.answer) label.style.outline = '3px solid var(--accent-green)';
    if (input.value === selected && selected !== q.answer) label.style.outline = '3px solid var(--accent-red)';
  });

  // Disable all radio inputs after submission
  Array.from(app.querySelectorAll('input[name="choice"]')).forEach(i => { i.disabled = true; });

  // Update score pill + pulse
  scorePill.textContent = `Score: ${score}`;
  scorePill.classList.remove("pulse");
  void scorePill.offsetWidth;
  scorePill.classList.add("pulse");

  updateScoreUI();

  // After submit: hide Submit, show Next
  submitBtn.style.display = "none";
  nextBtn.style.display = "";
}

function showSummary() {
  quizSection.style.display = "none";
  summarySection.style.display = "";

  const total = QUIZ.length;
  const correct = score;
  const incorrect = total - score;
  const accuracy = total ? Math.round((correct/total)*100) : 0;

  sumTotal.textContent = total;
  sumCorrect.textContent = correct;
  sumIncorrect.textContent = incorrect;
  sumAcc.textContent = accuracy + "%";

  // Track quiz completion
  const shuffleChoices = $("#shuffleChoices").checked;
  trackQuizComplete(total, shuffleChoices, correct, accuracy);

  // Build incorrect answers panel
  buildIncorrectPanel();

  // Play celebration sound and launch visual celebration
  playCelebrationSound();
  launchCelebration(6000);
}

function buildIncorrectPanel() {
  incorrectList.innerHTML = "";

  // Collect incorrect in order of appearance in the quiz
  const incorrectItems = QUIZ.filter(q => {
    const a = answered.get(q.number);
    return a && a.correct === false;
  });

  if (!incorrectItems.length) {
    incorrectPanel.style.display = "";
    const li = document.createElement('li');
    li.className = "incorrect-item empty-state";
    li.textContent = "Great job — no missed words!";
    incorrectList.appendChild(li);
    return;
  }

  incorrectItems.forEach(q => {
    const li = document.createElement('li');
    li.className = "incorrect-item";

    const word = document.createElement('div');
    word.className = "incorrect-word";
    word.textContent = q.word;

    // Build definition with highlighted example in the incorrect list
    const defTextRaw = (CURRENT_DEFINITIONS[q.word] || CURRENT_DEFINITIONS[q.word?.toUpperCase()] || "").trim?.() || "";
    const def = document.createElement('div');
    def.className = "incorrect-def def-example";

    if (defTextRaw) {
      const parts = defTextRaw.split(/—\s*Example:\s*/i);
      if (parts.length === 2) {
        const baseDef = parts[0];
        const example = parts[1];

        // Highlight base word and simple variants
        const base = String(q.word || "").toLowerCase();
        const highlightedExample = example.replace(
          new RegExp(`\\b(${base}\\w*)\\b`, "gi"),
          '<mark>$1</mark>'
        );

        def.innerHTML = `Definition: ${baseDef} — Example: ${highlightedExample}`;
      } else {
        def.textContent = `Definition: ${defTextRaw}`;
      }
    } else {
      def.textContent = "Definition: (not available)";
    }

    li.appendChild(word);
    li.appendChild(def);
    incorrectList.appendChild(li);
  });

  incorrectPanel.style.display = "";
}

// ===== Events =====
nextBtn.addEventListener("click", () => { idx++; renderQuestion(); });
submitBtn.addEventListener("click", submitCurrent);
buildBtn.addEventListener("click", buildQuiz);
userSel.addEventListener("change", updateSelections);
wordListSel.addEventListener("change", updateSelections);

// Add keyboard support for Enter key
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    
    // If submit button is visible and enabled, submit the current question
    if (submitBtn.style.display !== "none" && !submitBtn.disabled) {
      submitCurrent();
    }
    // If next button is visible AND quiz section is visible, go to next question
    else if (nextBtn.style.display !== "none" && quizSection.style.display !== "none") {
      idx++;
      renderQuestion();
    }
    // If build button is focused and enabled, build quiz
    else if (document.activeElement === buildBtn && !buildBtn.disabled) {
      buildQuiz();
    }
  }
});

// ===== Initialize =====
// Set initial state
buildBtn.disabled = true;
updateSelections();
