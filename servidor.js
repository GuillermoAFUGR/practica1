const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const seminarios = [
  {
    id: 'arquitectura-web-moderna',
    title: 'Arquitectura web moderna',
    speaker: 'Lucia Romero',
    date: '2026-04-16',
    time: '17:30',
    room: 'Auditorio Norte',
    description:
      'Buenas practicas para construir experiencias web solidas, rapidas y faciles de mantener.',
    ratings: [
      {
        id: 1,
        user: 'Claudia',
        score: 5,
        comment: 'Muy claro, practico y con ejemplos utiles.',
        createdAt: '2026-04-08T17:20:00.000Z',
      },
      {
        id: 2,
        user: 'Mario',
        score: 4,
        comment: 'Buen ritmo y contenido muy aplicable.',
        createdAt: '2026-04-08T18:05:00.000Z',
      },
    ],
  },
  {
    id: 'diseno-de-apis-escalables',
    title: 'Diseno de APIs escalables',
    speaker: 'Juan Perez',
    date: '2026-04-18',
    time: '19:00',
    room: 'Sala Beta',
    description:
      'Estrategias para modelar endpoints limpios, consistentes y pensados para crecer con el producto.',
    ratings: [
      {
        id: 3,
        user: 'Andrea',
        score: 5,
        comment: 'El bloque de seguridad estuvo especialmente bien explicado.',
        createdAt: '2026-04-08T19:10:00.000Z',
      },
    ],
  },
];

let nextRatingId =
  seminarios.reduce((maxId, seminario) => {
    const seminarMax = seminario.ratings.reduce(
      (currentMax, rating) => Math.max(currentMax, rating.id),
      0
    );

    return Math.max(maxId, seminarMax);
  }, 0) + 1;

function slugify(value) {
  return (
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'seminario'
  );
}

function createSeminarioId(title) {
  const baseId = slugify(title);
  let candidate = baseId;
  let suffix = 2;

  while (seminarios.some((seminario) => seminario.id === candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function getSeminarioById(id) {
  return seminarios.find((seminario) => seminario.id === id);
}

function getStats(ratings) {
  const total = ratings.length;
  const average = total
    ? Number(
        (ratings.reduce((sum, rating) => sum + rating.score, 0) / total).toFixed(1)
      )
    : 0;
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

function mapRating(rating) {
  return {
    id: rating.id,
    user: rating.user,
    score: rating.score,
    comment: rating.comment,
    createdAt: rating.createdAt,
  };
}

function mapSeminarioSummary(seminario) {
  return {
    id: seminario.id,
    title: seminario.title,
    speaker: seminario.speaker,
    date: seminario.date,
    time: seminario.time,
    room: seminario.room,
    description: seminario.description,
    stats: getStats(seminario.ratings),
  };
}

function mapSeminarioWithRatings(seminario) {
  return {
    ...mapSeminarioSummary(seminario),
    ratings: seminario.ratings.map(mapRating),
  };
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'portada.html'));
});

app.get('/puntuar', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'puntuar.html'));
});

app.get('/puntuaciones', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'puntuaciones.html'));
});

app.get('/api/seminarios', (req, res) => {
  res.json(seminarios.map(mapSeminarioSummary));
});

app.post('/api/seminarios', (req, res) => {
  const title = String(req.body.title || '').trim();
  const speaker = String(req.body.speaker || '').trim();
  const date = String(req.body.date || '').trim();
  const time = String(req.body.time || '').trim();
  const room = String(req.body.room || '').trim();
  const description = String(req.body.description || '').trim();

  if (!title || !speaker) {
    return res.status(400).json({
      message: 'Debes indicar al menos el titulo y el ponente del seminario.',
    });
  }

  const seminario = {
    id: createSeminarioId(title),
    title,
    speaker,
    date,
    time,
    room,
    description,
    ratings: [],
  };

  seminarios.unshift(seminario);
  return res.status(201).json(mapSeminarioSummary(seminario));
});

app.delete('/api/seminarios/:id', (req, res) => {
  const seminarioIndex = seminarios.findIndex(
    (seminario) => seminario.id === req.params.id
  );

  if (seminarioIndex === -1) {
    return res.status(404).json({ message: 'Seminario no encontrado.' });
  }

  const [deletedSeminario] = seminarios.splice(seminarioIndex, 1);

  return res.json({
    message: `Se ha borrado el seminario "${deletedSeminario.title}".`,
    seminario: mapSeminarioSummary(deletedSeminario),
  });
});

app.get('/api/seminarios/:id', (req, res) => {
  const seminario = getSeminarioById(req.params.id);

  if (!seminario) {
    return res.status(404).json({ message: 'Seminario no encontrado.' });
  }

  return res.json(mapSeminarioSummary(seminario));
});

app.get('/api/seminarios/:id/puntuaciones', (req, res) => {
  const seminario = getSeminarioById(req.params.id);

  if (!seminario) {
    return res.status(404).json({ message: 'Seminario no encontrado.' });
  }

  return res.json(mapSeminarioWithRatings(seminario));
});

app.post('/api/seminarios/:id/puntuaciones', (req, res) => {
  const seminario = getSeminarioById(req.params.id);

  if (!seminario) {
    return res.status(404).json({ message: 'Seminario no encontrado.' });
  }

  const user = String(req.body.user || '').trim();
  const comment = String(req.body.comment || '').trim();
  const score = Number(req.body.score);

  if (!user) {
    return res
      .status(400)
      .json({ message: 'Indica el nombre del usuario que puntua.' });
  }

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res
      .status(400)
      .json({ message: 'La puntuacion debe estar entre 1 y 5.' });
  }

  const rating = {
    id: nextRatingId,
    user,
    score,
    comment,
    createdAt: new Date().toISOString(),
  };

  nextRatingId += 1;
  seminario.ratings.unshift(rating);

  return res.status(201).json({
    message: 'Puntuacion guardada correctamente.',
    seminario: mapSeminarioWithRatings(seminario),
  });
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
