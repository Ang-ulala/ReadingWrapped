/* ─────────────────────────────────────────
   § 1 · DOM REFERENCES
───────────────────────────────────────── */
const $ = id => document.getElementById(id);
const DOM = {
  title:        $('input-title'),
  author:       $('input-author'),
  pages:        $('input-pages'),
  pageStart:    $('input-page-start'),
  pageEnd:      $('input-page-end'),
  hours:        $('input-hours'),
  minutes:      $('input-minutes'),
  clockStart:   $('input-clock-start'),
  clockEnd:     $('input-clock-end'),
  photo:        $('input-photo'),
  uploadZone:   $('upload-zone'),
  uploadName:   $('upload-name'),
  btnGenerate:  $('btn-generate'),
  btnDownload:  $('btn-download'),
  card:         $('reading-card'),
  cardBgPhoto:  $('card-bg-photo'),
  placeholder:  $('card-placeholder'),
  eyebrow:      $('card-eyebrow'),
  cardPages:    $('card-pages'),
  cardPace:     $('card-pace'),
  cardTime:     $('card-time'),

  pagesModeToggle:  $('pages-mode-toggle'),
  timeModeToggle:   $('time-mode-toggle'),
  themeModeToggle:  $('theme-mode-toggle'),
  accentModeToggle: $('accent-mode-toggle'),

  timerBox:      $('timer-box'),
  timerDisplay:  $('timer-display'),
  timerHint:     $('timer-hint'),
  btnTimerStart: $('btn-timer-start'),

  readingLock:    $('reading-lock'),
  lockBookTitle:  $('lock-book-title'),
  lockTimer:      $('lock-timer'),
  btnLockPause:   $('btn-lock-pause'),
  btnLockFinish:  $('btn-lock-finish'),
  btnLockCancel:  $('btn-lock-cancel'),
};

let pagesMode = 'total'; // 'total' | 'range'
let timeMode  = 'timer'; // 'timer' | 'clock' | 'manual'

/* ─────────────────────────────────────────
   § 2 · PHOTO UPLOAD
───────────────────────────────────────── */
function loadPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    DOM.cardBgPhoto.style.backgroundImage = `url('${e.target.result}')`;
    DOM.card.classList.add('has-photo');
    DOM.uploadName.textContent = '✓ ' + file.name;
    DOM.uploadName.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

DOM.photo.addEventListener('change', e => loadPhoto(e.target.files[0]));

DOM.uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  DOM.uploadZone.classList.add('dragover');
});
DOM.uploadZone.addEventListener('dragleave', () => DOM.uploadZone.classList.remove('dragover'));
DOM.uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  DOM.uploadZone.classList.remove('dragover');
  loadPhoto(e.dataTransfer.files[0]);
});

/* ─────────────────────────────────────────
   § 2.5 · TOGGLE DE MODOS (páginas / tempo)
───────────────────────────────────────── */
function setupModeToggle(toggleEl, panelAttr, onChange) {
  const panels = document.querySelectorAll(`[${panelAttr}]`);
  toggleEl.addEventListener('click', e => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    const mode = btn.dataset.mode;
    toggleEl.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
    panels.forEach(p => { p.hidden = p.getAttribute(panelAttr) !== mode; });
    onChange(mode);
  });
}

setupModeToggle(DOM.pagesModeToggle, 'data-pages-panel', mode => { pagesMode = mode; maybeRender(); });
setupModeToggle(DOM.timeModeToggle,  'data-time-panel',  mode => { timeMode  = mode; maybeRender(); });

/* ─────────────────────────────────────────
   § 2.6 · APARÊNCIA DO CARD (tema / cor)
───────────────────────────────────────── */
function setupSimpleToggle(toggleEl, onChange) {
  toggleEl.addEventListener('click', e => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    toggleEl.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
    onChange(btn.dataset.mode);
  });
}

setupSimpleToggle(DOM.themeModeToggle,  mode => { DOM.card.dataset.theme  = mode; });
setupSimpleToggle(DOM.accentModeToggle, mode => { DOM.card.dataset.accent = mode; });

/* ─────────────────────────────────────────
   § 3 · HELPERS DE CÁLCULO
───────────────────────────────────────── */
function formatTime(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h)      return `${h}h`;
  return `${m}m`;
}

function calcPace(totalMin, pages) {
  if (!pages) return '—';
  const v = totalMin / pages;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function getPages() {
  if (pagesMode === 'range') {
    const start = parseInt(DOM.pageStart.value, 10);
    const end   = parseInt(DOM.pageEnd.value, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return end - start;
  }
  return parseInt(DOM.pages.value, 10) || 0;
}

function getTotalMinutes() {
  if (timeMode === 'clock') {
    if (!DOM.clockStart.value || !DOM.clockEnd.value) return 0;
    const [sh, sm] = DOM.clockStart.value.split(':').map(Number);
    const [eh, em] = DOM.clockEnd.value.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // sessão que atravessa a meia-noite
    return diff;
  }
  if (timeMode === 'timer') {
    return timerState.finishedMinutes || 0;
  }
  const hours   = parseInt(DOM.hours.value,   10) || 0;
  const minutes = parseInt(DOM.minutes.value, 10) || 0;
  return hours * 60 + minutes;
}

function activePagesInput() {
  return pagesMode === 'range' ? DOM.pageStart : DOM.pages;
}

function activeTimeInput() {
  if (timeMode === 'clock')  return DOM.clockStart;
  if (timeMode === 'manual') return DOM.hours;
  return DOM.btnTimerStart;
}

/* ─────────────────────────────────────────
   § 4 · RENDER DO CARD
───────────────────────────────────────── */
function renderCard() {
  const title  = DOM.title.value.trim();
  const author = DOM.author.value.trim();
  const pages  = getPages();
  const total  = getTotalMinutes();

  if (!pages || pages <= 0) { flashError(activePagesInput()); return; }
  if (total <= 0)            { flashError(activeTimeInput());  return; }

  const bookLine = [title, author].filter(Boolean).join(' · ');
  DOM.eyebrow.textContent   = bookLine || 'Sessão de leitura';
  DOM.cardPages.innerHTML   = `${pages}<span class="stat-unit"> págs</span>`;
  DOM.cardPace.innerHTML    = `${calcPace(total, pages)}<span class="stat-unit"> min/pág</span>`;
  DOM.cardTime.textContent  = formatTime(total);

  DOM.placeholder.classList.add('hidden');
  DOM.btnDownload.style.display = 'block';
}

/* ─────────────────────────────────────────
   § 5 · FEEDBACK DE ERRO
───────────────────────────────────────── */
function flashError(el) {
  el.style.borderColor = '#ff4d4d';
  el.focus();
  setTimeout(() => el.style.borderColor = '', 2000);
}

/* ─────────────────────────────────────────
   § 5.5 · CRONÔMETRO / MODO LEITURA
───────────────────────────────────────── */
const timerState = {
  startedAt: null,
  elapsedMs: 0,
  running: false,
  intervalId: null,
  finishedMinutes: 0,
};

function formatClock(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function currentElapsedMs() {
  return timerState.elapsedMs + (timerState.running ? Date.now() - timerState.startedAt : 0);
}

function tickTimerDisplay() {
  DOM.lockTimer.textContent = formatClock(currentElapsedMs());
}

function openLockScreen() {
  const bookLine = [DOM.title.value.trim(), DOM.author.value.trim()].filter(Boolean).join(' · ');
  DOM.lockBookTitle.textContent = bookLine || 'Sessão de leitura';
  DOM.readingLock.hidden = false;
  document.body.style.overflow = 'hidden';
  startTimer();
}

function closeLockScreen() {
  DOM.readingLock.hidden = true;
  document.body.style.overflow = '';
}

function startTimer() {
  timerState.startedAt = Date.now();
  timerState.running = true;
  timerState.intervalId = setInterval(tickTimerDisplay, 250);
  DOM.readingLock.classList.remove('is-paused');
  DOM.btnLockPause.textContent = 'Pausar';
  tickTimerDisplay();
}

function pauseTimer() {
  timerState.elapsedMs += Date.now() - timerState.startedAt;
  timerState.running = false;
  clearInterval(timerState.intervalId);
  DOM.readingLock.classList.add('is-paused');
  DOM.btnLockPause.textContent = 'Continuar';
}

function togglePause() {
  if (timerState.running) pauseTimer();
  else startTimer();
}

function finishTimer() {
  const ms = currentElapsedMs();
  clearInterval(timerState.intervalId);
  timerState.running = false;

  const minutes = Math.max(1, Math.round(ms / 60000));
  timerState.finishedMinutes = minutes;
  closeLockScreen();

  DOM.timerBox.classList.add('is-done');
  DOM.timerDisplay.textContent = formatClock(ms);
  DOM.timerHint.textContent = `Concluído — ${formatTime(minutes)}`;
  DOM.btnTimerStart.textContent = '↻ Refazer leitura';

  renderCard();
}

function resetTimerBox() {
  timerState.elapsedMs = 0;
  timerState.startedAt = null;
  timerState.running = false;
  timerState.finishedMinutes = 0;
  DOM.timerBox.classList.remove('is-done');
  DOM.timerDisplay.textContent = '00:00:00';
  DOM.timerHint.textContent = 'Ainda não iniciado';
  DOM.btnTimerStart.textContent = '▶ Iniciar leitura';
}

function cancelTimer() {
  clearInterval(timerState.intervalId);
  resetTimerBox();
  closeLockScreen();
}

DOM.btnTimerStart.addEventListener('click', () => {
  if (DOM.timerBox.classList.contains('is-done')) resetTimerBox();
  openLockScreen();
});
DOM.btnLockPause.addEventListener('click', togglePause);
DOM.btnLockFinish.addEventListener('click', finishTimer);
DOM.btnLockCancel.addEventListener('click', () => {
  if (confirm('Cancelar a sessão de leitura em andamento? O tempo cronometrado será perdido.')) {
    cancelTimer();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !DOM.readingLock.hidden && timerState.running) pauseTimer();
});

/* ─────────────────────────────────────────
   § 6 · EXPORT PNG
───────────────────────────────────────── */
async function downloadCard() {
  DOM.btnDownload.textContent = 'GERANDO...';
  DOM.btnDownload.disabled = true;
  try {
    const rawCanvas = await html2canvas(DOM.card, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });

    // html2canvas não recorta corretamente o border-radius do elemento
    // capturado — os cantos ficam quadrados e o fundo "por fora" da
    // moldura vem preenchido de branco. Recortamos manualmente aqui.
    const radiusPx = parseFloat(getComputedStyle(DOM.card).borderRadius) || 16;
    const canvas = clipToRoundedCorners(rawCanvas, radiusPx * 3); // *3 = mesmo scale do html2canvas

    const safe = (DOM.title.value.trim() || 'reading-stats')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const a = document.createElement('a');
    a.download = `ang-${safe}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (err) {
    console.error('[ANG Export]', err);
    alert('Erro ao gerar PNG. Tente novamente.');
  } finally {
    DOM.btnDownload.textContent = '↓ BAIXAR PNG';
    DOM.btnDownload.disabled = false;
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function clipToRoundedCorners(sourceCanvas, radius) {
  const out = document.createElement('canvas');
  out.width = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx = out.getContext('2d');
  ctx.save();
  roundRectPath(ctx, 0, 0, out.width, out.height, radius);
  ctx.clip();
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();
  return out;
}

/* ─────────────────────────────────────────
   § 7 · EVENT LISTENERS
───────────────────────────────────────── */
DOM.btnGenerate.addEventListener('click', renderCard);
DOM.btnDownload.addEventListener('click', downloadCard);

const INPUT_FIELDS = [
  DOM.title, DOM.author,
  DOM.pages, DOM.pageStart, DOM.pageEnd,
  DOM.hours, DOM.minutes,
  DOM.clockStart, DOM.clockEnd,
];

// Enter em qualquer campo dispara o render
INPUT_FIELDS.forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') renderCard(); });
});

/* ─────────────────────────────────────────
   § 8 · LIVE PREVIEW (debounced)
───────────────────────────────────────── */
let debounce;
function maybeRender() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (getPages() > 0 && getTotalMinutes() > 0) renderCard();
  }, 400);
}
INPUT_FIELDS.forEach(el => {
  el.addEventListener('input', maybeRender);
});
