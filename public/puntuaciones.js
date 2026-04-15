const params = new URLSearchParams(window.location.search);
const seminarioId = params.get('seminario');

const puntuacionesTitle = document.getElementById('puntuaciones-title');
const puntuacionesSubtitle = document.getElementById('puntuaciones-subtitle');
const puntuacionesMeta = document.getElementById('puntuaciones-meta');
const puntuacionesStats = document.getElementById('puntuaciones-stats');
const ratingsList = document.getElementById('ratings-list');
const breakdownList = document.getElementById('breakdown-list');
const filterUser = document.getElementById('filter-user');
const clearFilter = document.getElementById('clear-filter');
const filterHint = document.getElementById('filter-hint');
const goToPuntuar = document.getElementById('go-to-puntuar');

let seminario = null;
let filterValue = '';

function formatDate(date) {
  if (!date) {
    return 'Fecha por confirmar';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getFilteredRatings() {
  if (!seminario) {
    return [];
  }

  const query = filterValue.trim().toLowerCase();

  if (!query) {
    return seminario.ratings;
  }

  return seminario.ratings.filter((rating) => rating.user.toLowerCase().includes(query));
}

function getStats(ratings) {
  const total = ratings.length;
  const average = total
    ? (ratings.reduce((sum, rating) => sum + rating.score, 0) / total).toFixed(1)
    : '0.0';
  const breakdown = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: ratings.filter((rating) => rating.score === score).length,
  }));

  return {
    total,
    average,
    breakdown,
  };
}

function renderMeta() {
  puntuacionesMeta.innerHTML = `
    <span class="tag"><strong>Ponente:</strong> ${escapeHtml(seminario.speaker)}</span>
    <span class="tag"><strong>Fecha:</strong> ${formatDate(seminario.date)}</span>
    <span class="tag"><strong>Hora:</strong> ${escapeHtml(seminario.time || 'Pendiente')}</span>
    <span class="tag"><strong>Sala:</strong> ${escapeHtml(seminario.room || 'Sin asignar')}</span>
  `;
}

function renderStats(ratings) {
  const filteredStats = getStats(ratings);
  const totalStats = seminario.stats;

  puntuacionesStats.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Media visible</span>
      <span class="stat-value">${
        filteredStats.total ? `${filteredStats.average}/5` : 'Sin notas'
      }</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Registros visibles</span>
      <span class="stat-value">${filteredStats.total}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Total del seminario</span>
      <span class="stat-value">${totalStats.total}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Media total</span>
      <span class="stat-value">${
        totalStats.total ? `${totalStats.average}/5` : 'Sin notas'
      }</span>
    </div>
  `;

  breakdownList.innerHTML = filteredStats.breakdown
    .map((item) => {
      const width = filteredStats.total ? (item.count / filteredStats.total) * 100 : 0;

      return `
        <div class="breakdown-row">
          <strong>${item.score}</strong>
          <div class="breakdown-track">
            <div class="breakdown-fill" style="width: ${width}%"></div>
          </div>
          <span>${item.count}</span>
        </div>
      `;
    })
    .join('');
}

function renderRatings(ratings) {
  if (!ratings.length) {
    ratingsList.innerHTML = `
      <div class="rating-item empty-state">
        No hay valoraciones que coincidan con el filtro actual.
      </div>
    `;
    return;
  }

  ratingsList.innerHTML = ratings
    .map(
      (rating) => `
        <article class="rating-item">
          <div class="rating-top">
            <div>
              <div class="rating-user">${escapeHtml(rating.user)}</div>
              <div class="rating-footer">${formatDateTime(rating.createdAt)}</div>
            </div>
            <span class="score-pill">${rating.score}/5</span>
          </div>
          <div class="rating-body">${escapeHtml(
            rating.comment || 'Sin comentario adicional.'
          )}</div>
        </article>
      `
    )
    .join('');
}

function renderFilterHint(ratings) {
  const query = filterValue.trim();

  if (!query) {
    filterHint.textContent = `Mostrando ${ratings.length} valoraciones del seminario.`;
    return;
  }

  filterHint.textContent = `Filtro activo: "${query}". Se muestran ${ratings.length} coincidencias.`;
}

function render() {
  if (!seminario) {
    puntuacionesTitle.textContent = 'Seminario no encontrado';
    puntuacionesSubtitle.textContent =
      'Vuelve a la portada, selecciona un seminario valido y consulta las puntuaciones desde alli.';
    puntuacionesMeta.innerHTML = '';
    puntuacionesStats.innerHTML = '';
    breakdownList.innerHTML = '';
    ratingsList.innerHTML = `
      <div class="rating-item empty-state">
        No se ha podido cargar el seminario solicitado.
      </div>
    `;
    goToPuntuar.classList.add('is-disabled');
    goToPuntuar.setAttribute('aria-disabled', 'true');
    return;
  }

  puntuacionesTitle.textContent = seminario.title;
  puntuacionesSubtitle.textContent =
    'Consulta las puntuaciones del usuario, revisa la media y filtra por nombre cuando lo necesites.';
  renderMeta();

  const ratings = getFilteredRatings();
  renderStats(ratings);
  renderRatings(ratings);
  renderFilterHint(ratings);

  goToPuntuar.href = `/puntuar?seminario=${encodeURIComponent(seminario.id)}`;
  goToPuntuar.classList.remove('is-disabled');
  goToPuntuar.setAttribute('aria-disabled', 'false');
}

async function loadSeminario() {
  if (!seminarioId) {
    render();
    return;
  }

  const response = await fetch(`/api/seminarios/${encodeURIComponent(seminarioId)}/puntuaciones`);
  const data = await response.json();

  if (!response.ok) {
    seminario = null;
    render();
    return;
  }

  seminario = data;
  render();
}

filterUser.addEventListener('input', (event) => {
  filterValue = event.target.value;
  render();
});

clearFilter.addEventListener('click', () => {
  filterValue = '';
  filterUser.value = '';
  render();
});

loadSeminario().catch(() => {
  seminario = null;
  render();
});
