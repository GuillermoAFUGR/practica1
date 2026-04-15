const seminarioSelect = document.getElementById('seminario-select');
const seminarioDetail = document.getElementById('seminario-detail');
const seminarioList = document.getElementById('seminario-list');
const createSeminarioForm = document.getElementById('create-seminario-form');
const formFeedback = document.getElementById('form-feedback');
const selectionFeedback = document.getElementById('selection-feedback');
const linkPuntuaciones = document.getElementById('link-puntuaciones');
const linkPuntuar = document.getElementById('link-puntuar');
const deleteSeminarioButton = document.getElementById('delete-seminario');

const state = {
  seminarios: [],
  selectedId: new URLSearchParams(window.location.search).get('seminario'),
};

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

function setFeedback(element, message, type) {
  if (!message) {
    element.textContent = '';
    element.className = 'notice hidden';
    return;
  }

  element.textContent = message;
  element.className = `notice ${type}`;
}

function getSelectedSeminario() {
  return state.seminarios.find((seminario) => seminario.id === state.selectedId) || null;
}

function updateActionLinks() {
  const seminario = getSelectedSeminario();

  if (!seminario) {
    linkPuntuar.href = '#';
    linkPuntuaciones.href = '#';
    linkPuntuar.classList.add('is-disabled');
    linkPuntuaciones.classList.add('is-disabled');
    deleteSeminarioButton.classList.add('is-disabled');
    linkPuntuar.setAttribute('aria-disabled', 'true');
    linkPuntuaciones.setAttribute('aria-disabled', 'true');
    deleteSeminarioButton.setAttribute('aria-disabled', 'true');
    return;
  }

  const query = `?seminario=${encodeURIComponent(seminario.id)}`;
  linkPuntuar.href = `/puntuar${query}`;
  linkPuntuaciones.href = `/puntuaciones${query}`;
  linkPuntuar.classList.remove('is-disabled');
  linkPuntuaciones.classList.remove('is-disabled');
  deleteSeminarioButton.classList.remove('is-disabled');
  linkPuntuar.setAttribute('aria-disabled', 'false');
  linkPuntuaciones.setAttribute('aria-disabled', 'false');
  deleteSeminarioButton.setAttribute('aria-disabled', 'false');
}

function renderSelect() {
  if (!state.seminarios.length) {
    seminarioSelect.innerHTML = '<option value="">No hay seminarios todavia</option>';
    seminarioSelect.disabled = true;
    return;
  }

  seminarioSelect.disabled = false;
  seminarioSelect.innerHTML = state.seminarios
    .map(
      (seminario) => `
        <option value="${seminario.id}" ${
          seminario.id === state.selectedId ? 'selected' : ''
        }>
          ${escapeHtml(seminario.title)} - ${escapeHtml(seminario.speaker)}
        </option>
      `
    )
    .join('');
}

function renderDetail() {
  const seminario = getSelectedSeminario();

  if (!seminario) {
    seminarioDetail.className = 'detail-card empty-state';
    seminarioDetail.textContent =
      'Aun no hay seminarios seleccionables. Crea uno nuevo para empezar.';
    return;
  }

  seminarioDetail.className = 'detail-card';
  seminarioDetail.innerHTML = `
    <h3>${escapeHtml(seminario.title)}</h3>
    <p>${escapeHtml(
      seminario.description || 'Seminario preparado para recibir puntuaciones y comentarios del usuario.'
    )}</p>
    <div class="meta-row">
      <span class="tag"><strong>Ponente:</strong> ${escapeHtml(seminario.speaker)}</span>
      <span class="tag"><strong>Fecha:</strong> ${formatDate(seminario.date)}</span>
      <span class="tag"><strong>Hora:</strong> ${escapeHtml(seminario.time || 'Pendiente')}</span>
      <span class="tag"><strong>Sala:</strong> ${escapeHtml(seminario.room || 'Sin asignar')}</span>
      <span class="tag"><strong>Media:</strong> ${
        seminario.stats.total ? `${seminario.stats.average}/5` : 'Sin notas'
      }</span>
    </div>
  `;
}

function renderSeminarioList() {
  if (!state.seminarios.length) {
    seminarioList.innerHTML = `
      <div class="detail-card empty-state">
        Cuando crees un seminario aparecera aqui con su resumen y sus accesos directos.
      </div>
    `;
    return;
  }

  seminarioList.innerHTML = state.seminarios
    .map(
      (seminario) => `
        <article class="seminario-card ${
          seminario.id === state.selectedId ? 'is-active' : ''
        }" data-id="${seminario.id}">
          <div class="mini-top">
            <div>
              <h3>${escapeHtml(seminario.title)}</h3>
              <p>${escapeHtml(seminario.speaker)}</p>
            </div>
            <span class="score-pill">${
              seminario.stats.total ? `${seminario.stats.average}/5` : 'Nueva'
            }</span>
          </div>
          <p>${escapeHtml(seminario.description || 'Sin descripcion todavia.')}</p>
          <div class="meta-row">
            <span class="tag">${formatDate(seminario.date)}</span>
            <span class="tag">${escapeHtml(seminario.time || 'Hora pendiente')}</span>
            <span class="tag">${seminario.stats.total} puntuaciones</span>
          </div>
        </article>
      `
    )
    .join('');
}

function render() {
  renderSelect();
  renderDetail();
  renderSeminarioList();
  updateActionLinks();
}

async function loadSeminarios(preferredId) {
  const response = await fetch('/api/seminarios');
  state.seminarios = await response.json();

  if (!state.seminarios.length) {
    state.selectedId = null;
    render();
    return;
  }

  const candidateId = preferredId || state.selectedId;
  const candidateExists = state.seminarios.some((seminario) => seminario.id === candidateId);

  state.selectedId = candidateExists ? candidateId : state.seminarios[0].id;
  render();
}

seminarioSelect.addEventListener('change', (event) => {
  state.selectedId = event.target.value;
  render();
});

seminarioList.addEventListener('click', (event) => {
  const card = event.target.closest('[data-id]');

  if (!card) {
    return;
  }

  state.selectedId = card.dataset.id;
  render();
});

createSeminarioForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFeedback(formFeedback, '', '');
  setFeedback(selectionFeedback, '', '');

  const formData = new FormData(createSeminarioForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/seminarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo crear el seminario.');
    }

    createSeminarioForm.reset();
    setFeedback(formFeedback, 'Seminario creado correctamente.', 'success');
    await loadSeminarios(data.id);
  } catch (error) {
    setFeedback(formFeedback, error.message, 'error');
  }
});

deleteSeminarioButton.addEventListener('click', async () => {
  const seminario = getSelectedSeminario();

  setFeedback(selectionFeedback, '', '');

  if (!seminario) {
    setFeedback(selectionFeedback, 'Selecciona un seminario para poder borrarlo.', 'error');
    return;
  }

  const confirmed = window.confirm(
    `Se borrara el seminario "${seminario.title}" y sus puntuaciones. ¿Quieres continuar?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/seminarios/${encodeURIComponent(seminario.id)}`, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo borrar el seminario.');
    }

    await loadSeminarios();
    setFeedback(selectionFeedback, data.message, 'success');
  } catch (error) {
    setFeedback(selectionFeedback, error.message, 'error');
  }
});

loadSeminarios().catch(() => {
  setFeedback(
    formFeedback,
    'No se han podido cargar los seminarios. Revisa el servidor e intentalo de nuevo.',
    'error'
  );
});
