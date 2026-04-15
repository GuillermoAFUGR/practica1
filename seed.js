require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const seminariosDeMuestra = [
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
        user: 'Claudia',
        score: 5,
        comment: 'Muy claro, practico y con ejemplos utiles.',
        createdAt: '2026-04-08T17:20:00.000Z',
      },
      {
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
        user: 'Andrea',
        score: 5,
        comment: 'El bloque de seguridad estuvo especialmente bien explicado.',
        createdAt: '2026-04-08T19:10:00.000Z',
      },
    ],
  },
];

const mongoUri =
  process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/';
const dbName = process.env.MONGODB_DB_NAME || 'puntuaciones';
const legacyDataFile = path.join(__dirname, 'data', 'seminarios.json');

const client = new MongoClient(mongoUri);
const database = client.db(dbName);
const coleccionSeminarios = database.collection('seminarios');
const coleccionPuntuaciones = database.collection('puntuaciones');

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

function cargarDatosIniciales() {
  if (fs.existsSync(legacyDataFile)) {
    const fileContent = fs.readFileSync(legacyDataFile, 'utf8');
    const parsedData = JSON.parse(fileContent);

    if (Array.isArray(parsedData) && parsedData.length > 0) {
      return parsedData;
    }
  }

  return seminariosDeMuestra;
}

function normalizarSeminarios(datos) {
  const usedIds = new Set();

  return datos.map((seminario, index) => {
    const baseId = seminario.id || slugify(seminario.title || `seminario-${index + 1}`);
    let candidateId = baseId;
    let suffix = 2;

    while (usedIds.has(candidateId)) {
      candidateId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(candidateId);

    return {
      id: candidateId,
      title: seminario.title || `Seminario ${index + 1}`,
      speaker: seminario.speaker || seminario.autor || 'Pendiente',
      date: seminario.date || '',
      time: seminario.time || '',
      room: seminario.room || '',
      description: seminario.description || '',
      ratings: Array.isArray(seminario.ratings) ? seminario.ratings : [],
      createdAt:
        seminario.createdAt || new Date(Date.now() + index).toISOString(),
    };
  });
}

async function borrarDatosPrevios() {
  await coleccionSeminarios.deleteMany({});
  await coleccionPuntuaciones.deleteMany({});
}

async function insertarDatos(datos) {
  const documentosSeminarios = datos.map(({ ratings, ...seminario }) => seminario);
  return coleccionSeminarios.insertMany(documentosSeminarios);
}

function muestraTodosLosSeminarios() {
  return coleccionSeminarios.find({}).sort({ createdAt: -1 }).toArray();
}

async function insertarPuntuaciones(datos) {
  const documentosPuntuaciones = datos.flatMap((seminario) =>
    seminario.ratings.map((rating) => ({
      seminarioId: seminario.id,
      user: rating.user || 'Anonimo',
      score: Number(rating.score) || 0,
      comment: rating.comment || '',
      createdAt: rating.createdAt || new Date().toISOString(),
    }))
  );

  if (!documentosPuntuaciones.length) {
    return { insertedCount: 0 };
  }

  return coleccionPuntuaciones.insertMany(documentosPuntuaciones);
}

async function puntuaA(seminarioId, user, score, comment) {
  return coleccionPuntuaciones.insertOne({
    seminarioId,
    user,
    score,
    comment,
    createdAt: new Date().toISOString(),
  });
}

function mostrarLasPuntuacionesDe(seminarioId) {
  return coleccionPuntuaciones
    .find({ seminarioId })
    .sort({ createdAt: -1 })
    .toArray();
}

const seminarios = normalizarSeminarios(cargarDatosIniciales());

borrarDatosPrevios()
  .then(() => insertarDatos(seminarios))
  .then((resultado) => {
    console.log('Seminarios insertados:', resultado.insertedCount);
    return insertarPuntuaciones(seminarios);
  })
  .then((resultado) => {
    console.log('Puntuaciones iniciales insertadas:', resultado.insertedCount);
    return muestraTodosLosSeminarios();
  })
  .then((resultado) => {
    console.log('Seminarios en la BD:', resultado);
    return mostrarLasPuntuacionesDe(seminarios[0].id);
  })
  .then((puntuaciones) => {
    console.log('Puntuaciones del primer seminario:', puntuaciones);
  })
  .catch((error) => {
    console.error('Error al poblar la base de datos:', error.message);
    process.exitCode = 1;
  })
  .finally(() => client.close());
