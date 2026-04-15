const params = new URLSearchParams(window.location.search);
const seminarioId = params.get('seminario');

const puntuarTitle = document.getElementById('puntuar-title');
const puntuarSubtitle = document.getElementById('puntuar-subtitle');
const seminarioMeta = document.getElementById('seminario-meta');
const ratingForm = document.getElementById('rating-form');
const ratingFeedback = document.getElementById('rating-feedback');
const ratingStats = document.getElementById('rating-stats');
const recentRatings = document.getElementById('recent-ratings');
const goToPuntuaciones = document.getElementById('go-to-puntuaciones');

let seminario = null;

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

function setFeedback(message, type) {
  if (!message) {
    ratingFeedback.textContent = '';
    ratingFeedback.className = 'notice hidden';
    return;
  }

  ratingFeedback.textContent = message;
  ratingFeedback.className = `notice ${type}`;
}

function renderStats() {
  ratingStats.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Media actual</span>
      <span class="stat-value">${
        seminario.stats.total ? `${seminario.stats.average}/5` : 'Sin notas'
      }</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Valoraciones</span>
      <span class="stat-value">${seminario.stats.total}</span>
    </div>
  `;
}

function renderRecentRatings() {
  if (!seminario.ratings.length) {
    recentRatings.innerHTML = `
      <div class="mini-item">
        <p>Todavia no hay puntuaciones registradas para este seminario.</p>
      </div>
    `;
    return;
  }

  recentRatings.innerHTML = seminario.ratings
    .slice(0, 3)
    .map(
      (rating) => `
        <div class="mini-item">
          <div class="mini-top">
            <span class="mini-title">${escapeHtml(rating.user)}</span>
            <span class="score-pill">${rating.score}/5</span>
          </div>
          <p>${escapeHtml(rating.comment || 'Sin comentario adicional.')}</p>
          <div class="rating-footer">${formatDateTime(rating.createdAt)}</div>
        </div>
      `
    )
    .join('');
}

function renderSeminario() {
  if (!seminario) {
    puntuarTitle.textContent = 'Seminario no encontrado';
    puntuarSubtitle.textContent =
      'Vuelve a la portada, selecciona un seminario valido y prueba de nuevo.';
    seminarioMeta.innerHTML = '';
    ratingStats.innerHTML = '';
    recentRatings.innerHTML = '';
    ratingForm.classList.add('hidden');
    goToPuntuaciones.classList.add('is-disabled');
    goToPuntuaciones.setAttribute('aria-disabled', 'true');
    return;
  }

  puntuarTitle.textContent = seminario.title;
  puntuarSubtitle.textContent = `Ponente: ${seminario.speaker}. Registra aqui la puntuacion del usuario y guarda su comentario.`;
  ratingForm.classList.remove('hidden');
  seminarioMeta.innerHTML = `
    <span class="tag"><strong>Fecha:</strong> ${formatDate(seminario.date)}</span>
    <span class="tag"><strong>Hora:</strong> ${escapeHtml(seminario.time || 'Pendiente')}</span>
    <span class="tag"><strong>Sala:</strong> ${escapeHtml(seminario.room || 'Sin asignar')}</span>
  `;
  goToPuntuaciones.href = `/puntuaciones?seminario=${encodeURIComponent(seminario.id)}`;
  goToPuntuaciones.classList.remove('is-disabled');
  goToPuntuaciones.setAttribute('aria-disabled', 'false');
  renderStats();
  renderRecentRatings();
}

async function loadSeminario() {
  if (!seminarioId) {
    renderSeminario();
    return;
  }

  const response = await fetch(`/api/seminarios/${encodeURIComponent(seminarioId)}/puntuaciones`);
  const data = await response.json();

  if (!response.ok) {
    seminario = null;
    renderSeminario();
    return;
  }

  seminario = data;
  renderSeminario();
}

ratingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFeedback('', '');

  if (!seminario) {
    setFeedback('No hay un seminario valido seleccionado.', 'error');
    return;
  }

  const formData = new FormData(ratingForm);
  const payload = {
    user: formData.get('user'),
    score: Number(formData.get('score')),
    comment: formData.get('comment'),
  };
  const lastUser = payload.user;

  try {
    const response = await fetch(`/api/seminarios/${encodeURIComponent(seminario.id)}/puntuaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo guardar la puntuacion.');
    }

    seminario = data.seminario;
    ratingForm.reset();
    ratingForm.elements.user.value = lastUser;
    renderSeminario();
    setFeedback(data.message, 'success');
  } catch (error) {
    setFeedback(error.message, 'error');
  }
});

loadSeminario().catch(() => {
  seminario = null;
  renderSeminario();
  setFeedback(
    'No se ha podido cargar el seminario. Revisa el servidor e intentalo de nuevo.',
    'error'
  );
});
