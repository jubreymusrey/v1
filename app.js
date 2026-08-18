// --- DATABASE JULAT RUJUKAN (ANIMAL HEMATOLOGY) ---
const referenceRanges = {
  Cattle:   { Neutrophil: [15, 45], Lymphocyte: [45, 75], Monocyte: [2, 7], Eosinophil: [2, 20], Basophil: [0, 2] },
  Sheep:    { Neutrophil: [10, 50], Lymphocyte: [40, 75], Monocyte: [0, 6], Eosinophil: [0, 10], Basophil: [0, 3] },
  Goats:    { Neutrophil: [10, 50], Lymphocyte: [40, 75], Monocyte: [0, 6], Eosinophil: [0, 10], Basophil: [0, 2] },
  Pigs:     { Neutrophil: [28, 47], Lymphocyte: [39, 62], Monocyte: [2, 10], Eosinophil: [1, 11], Basophil: [0, 2] },
  Dogs:     { Neutrophil: [60, 77], Lymphocyte: [12, 30], Monocyte: [3, 10], Eosinophil: [2, 10], Basophil: [0, 1] },
  Cats:     { Neutrophil: [35, 75], Lymphocyte: [20, 55], Monocyte: [1, 4], Eosinophil: [2, 12], Basophil: [0, 1] },
  Horses:   { Neutrophil: [35, 75], Lymphocyte: [15, 50], Monocyte: [2, 10], Eosinophil: [2, 12], Basophil: [0, 3] },
  Elephant: { Neutrophil: [22, 50], Lymphocyte: [40, 60], Monocyte: [1.7, 5], Eosinophil: [6, 15], Basophil: [0.3, 2] },
  Camel:    { Neutrophil: [38.7, 38.7], Lymphocyte: [46, 46], Monocyte: [5.7, 5.7], Eosinophil: [9.5, 9.5], Basophil: [1, 1] },
  Rabbit:   { Neutrophil: [17, 52], Lymphocyte: [42, 80], Monocyte: [5, 8], Eosinophil: [0.3, 0.3], Basophil: [0, 5] },
  Fowl:     { Neutrophil: [29.5, 37.3], Lymphocyte: [48.9, 58.5], Monocyte: [9.7, 10.2], Eosinophil: [1.7, 1.7], Basophil: [0.7, 2] },
  Man:      { Neutrophil: [55, 70], Lymphocyte: [25, 70], Monocyte: [3, 7], Eosinophil: [1, 4], Basophil: [0, 1] }
};

// --- DATA STATES ---
let counts = { Neutrophil: 0, Lymphocyte: 0, Monocyte: 0, Eosinophil: 0, Basophil: 0 };
let countHistory = [];
let isListening = false;
let recognition = null;

// --- DOM ELEMENTS ---
const btnStartVoice = document.getElementById('btnStartVoice');
const btnVoiceText = document.getElementById('btnVoiceText');
const btnReset = document.getElementById('btnReset');
const micStatusText = document.getElementById('micStatusText');
const micDot = document.getElementById('micDot');
const micStatusBadge = document.getElementById('micStatusBadge');
const totalCounter = document.getElementById('totalCounter');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const speciesSelect = document.getElementById('speciesSelect');
const resultsModal = document.getElementById('resultsModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnNewCount = document.getElementById('btnNewCount');

// --- ALIAS KAMUS SEBUTAN ---
const cellAliases = {
  Neutrophil: ['neutrophil', 'neutro', 'seg', 'band', 'neutrophils'],
  Lymphocyte: ['lymphocyte', 'lymph', 'lym', 'lymphocytes'],
  Monocyte: ['monocyte', 'mono', 'monocytes'],
  Eosinophil: ['eosinophil', 'eosi', 'eos', 'eosinophils'],
  Basophil: ['basophil', 'baso', 'basophils']
};

const undoAliases = ['undo', 'correction', 'tolak', 'back', 'delete'];

// --- INISIALISASI WEB SPEECH API ---
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Pelayar web anda tidak menyokong Web Speech API. Sila guna Google Chrome atau Microsoft Edge.");
    return null;
  }

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = false;
  rec.lang = 'en-US';

  rec.onstart = () => {
    isListening = true;
    updateMicUI(true);
  };

  rec.onend = () => {
    // Auto-restart jika pengguna belum hentikan secara manual dan belum cecah 100
    if (isListening && getTotalCount() < 100) {
      try { rec.start(); } catch (e) {}
    } else {
      isListening = false;
      updateMicUI(false);
    }
  };

  rec.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    if (event.error === 'not-allowed') {
      alert("Akses mikrofon ditolak! Sila benarkan akses mikrofon di tetapan pelayar anda.");
      isListening = false;
      updateMicUI(false);
    }
  };

  rec.onresult = (event) => {
    const lastIndex = event.results.length - 1;
    const transcript = event.results[lastIndex][0].transcript.trim().toLowerCase();
    processVoiceCommand(transcript);
  };

  return rec;
}

// --- PROSES SEBUTAN SUARA ---
function processVoiceCommand(transcript) {
  if (getTotalCount() >= 100) return;

  // Semak arahan UNDO
  if (undoAliases.some(alias => transcript.includes(alias))) {
    handleUndo();
    return;
  }

  // Semak sebutan sel
  for (const [cellType, aliases] of Object.entries(cellAliases)) {
    if (aliases.some(alias => transcript.includes(alias))) {
      addCount(cellType);
      playBeepSound();
      break;
    }
  }
}

// --- LOGIK KIRAAN SEL ---
function addCount(cellType) {
  if (getTotalCount() >= 100) return;

  counts[cellType]++;
  countHistory.push(cellType);
  updateUI();

  if (getTotalCount() >= 100) {
    stopListening();
    showResults();
  }
}

function updateManualCount(cellType, delta) {
  if (delta === 1 && getTotalCount() >= 100) return;
  if (delta === -1 && counts[cellType] <= 0) return;

  counts[cellType] += delta;
  if (delta === 1) {
    countHistory.push(cellType);
  } else {
    const idx = countHistory.lastIndexOf(cellType);
    if (idx !== -1) countHistory.splice(idx, 1);
  }

  updateUI();

  if (getTotalCount() >= 100) {
    stopListening();
    showResults();
  }
}

function handleUndo() {
  if (countHistory.length === 0) return;
  const lastCell = countHistory.pop();
  if (counts[lastCell] > 0) {
    counts[lastCell]--;
    updateUI();
  }
}

function getTotalCount() {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

// --- PEMASANGAN UI ---
function updateUI() {
  const total = getTotalCount();

  // Update Kad Sel
  for (const [cellType, count] of Object.entries(counts)) {
    document.getElementById(`count${cellType}`).innerText = count;
    document.getElementById(`percent${cellType}`).innerText = `(${count}%)`;
  }

  // Update Header Badges
  totalCounter.innerText = `${total} / 100`;
  progressBar.style.width = `${total}%`;
  progressPercent.innerText = `${total}%`;
}

function updateMicUI(active) {
  if (active) {
    micDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-animation";
    micStatusText.innerText = "Mic Status: AKTIFF (Mendengar...)";
    micStatusBadge.className = "flex items-center gap-2 bg-emerald-950 border border-emerald-700/50 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-300";
    btnStartVoice.className = "flex-1 md:flex-initial bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-2";
    btnVoiceText.innerText = "Stop Listening";
  } else {
    micDot.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
    micStatusText.innerText = "Mic Status: Tidak Aktif";
    micStatusBadge.className = "flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400";
    btnStartVoice.className = "flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-2";
    btnVoiceText.innerText = "Start Listening";
  }
}

// --- KAWALAN SUARA START / STOP ---
function toggleListening() {
  if (!recognition) recognition = initSpeechRecognition();
  if (!recognition) return;

  if (isListening) {
    stopListening();
  } else {
    if (getTotalCount() >= 100) {
      alert("Kiraan sudah cecah 100! Sila 'Reset' untuk mula semula.");
      return;
    }
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  }
}

function stopListening() {
  isListening = false;
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }
  updateMicUI(false);
}

// --- BUNYI BEEP RINGKAS ---
function playBeepSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// --- PAPARAN MODAL ANALISIS KEPUTUSAN ---
function showResults() {
  const species = speciesSelect.value;
  document.getElementById('modalSpeciesName').innerText = species;
  const tableBody = document.getElementById('resultsTableBody');
  tableBody.innerHTML = '';

  const ref = referenceRanges[species] || {};

  for (const [cellType, count] of Object.entries(counts)) {
    const range = ref[cellType] || [0, 0];
    let statusText = 'Normal';
    let statusBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';

    if (range[0] === range[1]) {
      // Untuk spesies satu nilai sahaja (contoh: Camel/Rabbit)
      if (count > range[0]) {
        statusText = 'High / Elevated';
        statusBg = 'bg-rose-100 text-rose-800 border-rose-300';
      } else if (count < range[0]) {
        statusText = 'Low / Decreased';
        statusBg = 'bg-blue-100 text-blue-800 border-blue-300';
      }
    } else {
      if (count > range[1]) {
        statusText = 'High / Elevated';
        statusBg = 'bg-rose-100 text-rose-800 border-rose-300';
      } else if (count < range[0]) {
        statusText = 'Low / Decreased';
        statusBg = 'bg-blue-100 text-blue-800 border-blue-300';
      }
    }

    const rangeDisplay = (range[0] === range[1]) ? `${range[0]}%` : `${range[0]} – ${range[1]}%`;

    const row = `
      <tr>
        <td class="p-3 font-semibold text-slate-800">${cellType}</td>
        <td class="p-3 text-center font-bold text-slate-700">${count}%</td>
        <td class="p-3 text-center text-slate-600">${rangeDisplay}</td>
        <td class="p-3 text-center">
          <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${statusBg}">
            ${statusText}
          </span>
        </td>
      </tr>
    `;
    tableBody.innerHTML += row;
  }

  resultsModal.classList.remove('hidden');
}

// --- RESET ALL ---
function resetCounter() {
  counts = { Neutrophil: 0, Lymphocyte: 0, Monocyte: 0, Eosinophil: 0, Basophil: 0 };
  countHistory = [];
  stopListening();
  updateUI();
  resultsModal.classList.add('hidden');
}

// --- EVENT LISTENERS ---
btnStartVoice.addEventListener('click', toggleListening);
btnReset.addEventListener('click', resetCounter);
btnCloseModal.addEventListener('click', () => resultsModal.classList.add('hidden'));
btnNewCount.addEventListener('click', resetCounter);

// Inisialisasi UI Pertama
updateUI();