require('dotenv').config();

const express = require('express');
const path = require('path');
const {
  connectToDatabase,
  getSeminariosCollection,
  getPuntuacionesCollection,
  closeDatabase,
} = require('./mongo');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getStats(ratings) {
  const total = ratings.length;
  const average = total
    ? Number(
        (ratings.reduce((sum, rating) => sum + Number(rating.score || 0), 0) / total).toFixed(
          1
        )
      )
    : 0;
  const breakdown = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: ratings.filter((rating) => Number(rating.score) === score).length,
  }));

  return {
    total,
    average,
    breakdown,
  };
}

function mapRating(rating) {
  return {
    id: rating._id.toString(),
    user: rating.user,
    score: rating.score,
    comment: rating.comment,
    createdAt: rating.createdAt,
  };
}

function mapSeminarioDocument(seminario) {
  return {
    id: seminario.id,
    title: seminario.title,
    speaker: seminario.speaker,
    date: seminario.date,
    time: seminario.time,
    room: seminario.room,
    description: seminario.description,
  };
}

function mapSeminarioSummary(seminario, ratings) {
  return {
    ...mapSeminarioDocument(seminario),
    stats: getStats(ratings),
  };
}

async function createSeminarioId(title) {
  const seminariosCollection = getSeminariosCollection();
  const baseId = slugify(title);
  let candidate = baseId;
  let suffix = 2;

  while (await seminariosCollection.findOne({ id: candidate }, { projection: { _id: 1 } })) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function getSeminarioById(id) {
  return getSeminariosCollection().findOne({ id }, { projection: { _id: 0 } });
}

async function getRatingsForSeminario(seminarioId) {
  return getPuntuacionesCollection()
    .find({ seminarioId })
    .sort({ createdAt: -1 })
    .toArray();
}

async function getRatingsMapForSeminarios(seminarioIds) {
  const ratings = await getPuntuacionesCollection()
    .find({ seminarioId: { $in: seminarioIds } })
    .toArray();

  const ratingsMap = new Map();

  seminarioIds.forEach((seminarioId) => {
    ratingsMap.set(seminarioId, []);
  });

  ratings.forEach((rating) => {
    const seminarRatings = ratingsMap.get(rating.seminarioId) || [];
    seminarRatings.push(rating);
    ratingsMap.set(rating.seminarioId, seminarRatings);
  });

  return ratingsMap;
}

async function ensureIndexes() {
  await getSeminariosCollection().createIndex({ id: 1 }, { unique: true });
  await getPuntuacionesCollection().createIndex({ seminarioId: 1, createdAt: -1 });
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

app.get(
  '/api/seminarios',
  asyncHandler(async (req, res) => {
    const seminarios = await getSeminariosCollection()
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const ratingsMap = await getRatingsMapForSeminarios(seminarios.map((seminario) => seminario.id));
    const response = seminarios.map((seminario) =>
      mapSeminarioSummary(seminario, ratingsMap.get(seminario.id) || [])
    );

    res.json(response);
  })
);

app.post(
  '/api/seminarios',
  asyncHandler(async (req, res) => {
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

    const now = new Date().toISOString();
    const seminario = {
      id: await createSeminarioId(title),
      title,
      speaker,
      date,
      time,
      room,
      description,
      createdAt: now,
      updatedAt: now,
    };

    await getSeminariosCollection().insertOne(seminario);
    return res.status(201).json(mapSeminarioSummary(seminario, []));
  })
);

app.delete(
  '/api/seminarios/:id',
  asyncHandler(async (req, res) => {
    const seminario = await getSeminarioById(req.params.id);

    if (!seminario) {
      return res.status(404).json({ message: 'Seminario no encontrado.' });
    }

    await getSeminariosCollection().deleteOne({ id: req.params.id });
    await getPuntuacionesCollection().deleteMany({ seminarioId: req.params.id });

    return res.json({
      message: `Se ha borrado el seminario "${seminario.title}".`,
      seminario: mapSeminarioSummary(seminario, []),
    });
  })
);

app.get(
  '/api/seminarios/:id',
  asyncHandler(async (req, res) => {
    const seminario = await getSeminarioById(req.params.id);

    if (!seminario) {
      return res.status(404).json({ message: 'Seminario no encontrado.' });
    }

    const ratings = await getRatingsForSeminario(req.params.id);
    return res.json(mapSeminarioSummary(seminario, ratings));
  })
);

app.get(
  '/api/seminarios/:id/puntuaciones',
  asyncHandler(async (req, res) => {
    const seminario = await getSeminarioById(req.params.id);

    if (!seminario) {
      return res.status(404).json({ message: 'Seminario no encontrado.' });
    }

    const ratings = await getRatingsForSeminario(req.params.id);

    return res.json({
      ...mapSeminarioSummary(seminario, ratings),
      ratings: ratings.map(mapRating),
    });
  })
);

app.post(
  '/api/seminarios/:id/puntuaciones',
  asyncHandler(async (req, res) => {
    const seminario = await getSeminarioById(req.params.id);

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

    await getPuntuacionesCollection().insertOne({
      seminarioId: seminario.id,
      user,
      score,
      comment,
      createdAt: new Date().toISOString(),
    });

    const ratings = await getRatingsForSeminario(req.params.id);

    return res.status(201).json({
      message: 'Puntuacion guardada correctamente.',
      seminario: {
        ...mapSeminarioSummary(seminario, ratings),
        ratings: ratings.map(mapRating),
      },
    });
  })
);

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: 'Ha ocurrido un error interno al procesar la peticion.',
  });
});

async function startServer() {
  await connectToDatabase();
  await ensureIndexes();

  app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });
}

async function shutdown() {
  await closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown().catch(() => process.exit(1));
});

process.on('SIGTERM', () => {
  shutdown().catch(() => process.exit(1));
});

startServer().catch((error) => {
  console.error(
    'No se pudo conectar con MongoDB. Arranca Docker Compose con "docker compose up -d" y vuelve a intentarlo.'
  );
  console.error(error.message);
  process.exit(1);
});
