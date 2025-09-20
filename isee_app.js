// isee_app.js - Main application logic for ISEE Vocabulary Quiz

// ===== Analytics Configuration =====
const ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbyy_ETV4BKrilkr2UalfgiBG_4NlTuKLGt8HRfgb-17sdWyJBZ_6VaxyaQGupk1Nfzi/exec';
const SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let quizStartTime = null;
let userIP = null;
let selectedUser = null;

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

  // Build URL parameters
  const params = new URLSearchParams({
    event: eventData.event,
    sessionId: SESSION_ID,
    user: selectedUser || 'unknown',
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    ipAddress: userIP || 'unknown',
    timestamp: new Date().toISOString(),
    ...eventData
  });

  const url = ANALYTICS_URL + '?' + params.toString();
  console.log('Sending analytics via GET:', url);
  console.log('Selected user:', selectedUser);
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
let idx = 0;
let score = 0;
let answered = new Map();   // number -> { selected, correct }
let choiceOrder = {};       // number -> ['A','B','C','D']

// ===== User Selection Logic =====
function updateUserSelection() {
  selectedUser = userSel.value;
  if (selectedUser) {
    statusEl.innerHTML = `<span class="good">User: ${selectedUser}. Ready to build quiz.</span>`;
    buildBtn.disabled = false;
  } else {
    statusEl.innerHTML = 'Ready. Please select a user first.';
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
  const defs = window.DEFINITIONS || {};
  const defRaw = (defs[word] || defs[word?.toUpperCase()] || "").trim?.() || "";
  
  if (!defRaw) return null;

  const defNode = document.createElement("div");
  defNode.className = "hint def-example";

  // Split on em dash "— Example:"
  const parts = defRaw.split(/—\s*Example:\s*/i);
  if (parts.length === 2) {
    const baseDef = parts[0];
    const example = parts[1];

    // Highlight base word and simple variants (e.g., devour, devoured, devouring, devours)
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
  const colors = ["#ff5a5f","#ffb703","#03d387","#1b6bff","#9b5de5","#00bbf9"];
  const pieces = Array.from({length: 200}, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * 100,
    r: 5 + Math.random() * 7,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 3.5,
    vx: -1 + Math.random() * 2,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4
  }));

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
      if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
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
  // Check if user is selected
  if (!selectedUser) {
    statusEl.innerHTML = '<span class="bad">Please select a user first.</span>';
    return;
  }

  // Ensure QUESTIONS is present (populated by isee_vocab_data.js)
  if (typeof window.QUESTIONS === "undefined" || !Array.isArray(window.QUESTIONS) || !window.QUESTIONS.length) {
    statusEl.innerHTML = '<span class="bad">No QUESTIONS found. Ensure isee_vocab_data.js is loaded before this script.</span>';
    return;
  }

  // Play build sound
  playBuildSound();

  const size = parseInt(subsetSel.value, 10) || 300;
  const shuffleChoices = $("#shuffleChoices").checked;

  const pool = window.QUESTIONS.slice();
  shuffle(pool);
  QUIZ = pool.slice(0, Math.min(size, pool.length));

  idx = 0; score = 0; answered.clear(); choiceOrder = {};
  quizSection.style.display = "";
  summarySection.style.display = "none";
  incorrectPanel.style.display = "none";
  incorrectList.innerHTML = "";

  const picked = QUIZ.length;
  const total = window.QUESTIONS.length;
  statusEl.innerHTML = `<span class="good">User: ${selectedUser}. Using ${picked} question(s) out of ${total}. Randomized order.</span>`;

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
    trackQuestionAnswer(q.number, q.word, correct, selected, q.answer);
  }

  feedbackEl.className = "feedback " + (correct ? "correct" : "incorrect");
  if (correct) {
    feedbackEl.textContent = "Correct!";
    playSuccessSound(); // Play success sound
  } else {
    const correctText = q.choices[q.answer];
    feedbackEl.innerHTML = `Incorrect. Correct answer: ${q.answer}) ${correctText}`;
    playErrorSound(); // Play error sound
  }

  // Always append definition (whether correct or incorrect)
  const defElement = createDefinitionElement(q.word, correct);
  if (defElement) {
    feedbackEl.appendChild(defElement);
  }

  // Highlight choice outlines (brighter colors)
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
  const defs = window.DEFINITIONS || {};

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
    const defTextRaw = (defs[q.word] || defs[q.word?.toUpperCase()] || "").trim?.() || "";
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
userSel.addEventListener("change", updateUserSelection);

// Add keyboard support for Enter key
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // Prevent default form submission
    
    // If submit button is visible and enabled, submit the current question
    if (submitBtn.style.display !== "none" && !submitBtn.disabled) {
      submitCurrent();
    }
    // If next button is visible, go to next question
    else if (nextBtn.style.display !== "none") {
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
updateUserSelection();