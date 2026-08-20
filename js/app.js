/* ─────────────────────────────────────────
   § 1 · DOM REFERENCES
───────────────────────────────────────── */
const $ = id => document.getElementById(id);
const DOM = {
  title:       $('input-title'),
  author:      $('input-author'),
  pages:       $('input-pages'),
  hours:       $('input-hours'),
  minutes:     $('input-minutes'),
  photo:       $('input-photo'),
  uploadZone:  $('upload-zone'),
  uploadName:  $('upload-name'),
  btnGenerate: $('btn-generate'),
  btnDownload: $('btn-download'),
  card:        $('reading-card'),
  cardBgPhoto: $('card-bg-photo'),
  placeholder: $('card-placeholder'),
  eyebrow:     $('card-eyebrow'),
  cardPages:   $('card-pages'),
  cardPace:    $('card-pace'),
  cardTime:    $('card-time'),
};

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

/* ─────────────────────────────────────────
   § 4 · RENDER DO CARD
───────────────────────────────────────── */
function renderCard() {
  const title   = DOM.title.value.trim();
  const author  = DOM.author.value.trim();
  const pages   = parseInt(DOM.pages.value, 10);
  const hours   = parseInt(DOM.hours.value,   10) || 0;
  const minutes = parseInt(DOM.minutes.value, 10) || 0;
  const total   = hours * 60 + minutes;

  if (!pages || pages <= 0) { flashError(DOM.pages);   return; }
  if (total === 0)          { flashError(DOM.hours);   return; }

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
   § 6 · EXPORT PNG
───────────────────────────────────────── */
async function downloadCard() {
  DOM.btnDownload.textContent = 'GERANDO...';
  DOM.btnDownload.disabled = true;
  try {
    const canvas = await html2canvas(DOM.card, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
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

/* ─────────────────────────────────────────
   § 7 · EVENT LISTENERS
───────────────────────────────────────── */
DOM.btnGenerate.addEventListener('click', renderCard);
DOM.btnDownload.addEventListener('click', downloadCard);

// Enter em qualquer campo dispara o render
[DOM.title, DOM.author, DOM.pages, DOM.hours, DOM.minutes].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') renderCard(); });
});

/* ─────────────────────────────────────────
   § 8 · LIVE PREVIEW (debounced)
───────────────────────────────────────── */
let debounce;
function maybeRender() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (DOM.pages.value > 0 && (DOM.hours.value > 0 || DOM.minutes.value > 0)) {
      renderCard();
    }
  }, 400);
}
[DOM.title, DOM.author, DOM.pages, DOM.hours, DOM.minutes].forEach(el => {
  el.addEventListener('input', maybeRender);
});
