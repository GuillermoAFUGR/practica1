const { buildMongoUrl, getEnv } = require('./config/env');
const { MongoClient } = require('mongodb');

const seminarios = [
  {
    id: 'seminario-1',
    titulo: 'Seminario 1',
    autor: 'Pepito',
  },
  {
    id: 'seminario-2',
    titulo: 'Seminario 2',
    autor: 'Luisito',
  },
  {
    id: 'seminario-3',
    titulo: 'Seminario 3',
    autor: 'Juanito',
  },
];

const client = new MongoClient(buildMongoUrl());
const database = client.db(getEnv('MONGODB_DB_NAME', 'puntuaciones'));
const coleccionSeminarios = database.collection('seminarios');
const coleccionPuntuaciones = database.collection('puntuaciones');

async function borrarDatosPrevios() {
  await coleccionSeminarios.deleteMany({});
  await coleccionPuntuaciones.deleteMany({});
}

async function insertarDatos(datos) {
  const resultadoInsert = await coleccionSeminarios.insertMany(datos);
  return resultadoInsert;
}

function muestraTodosLosSeminarios() {
  return coleccionSeminarios.find({}).toArray();
}

async function puntuaA(autor, utilidad, calidad, fecha = new Date().toLocaleString('es-ES')) {
  const resu = await coleccionPuntuaciones.insertOne({
    seminario_de: autor,
    utilidad,
    calidad,
    fecha,
  });
  return resu;
}

function mostrarLasPuntuacionesDe(autor) {
  return coleccionPuntuaciones.find({ seminario_de: autor }).toArray();
}

borrarDatosPrevios()
  .then(() => insertarDatos(seminarios))
  .then((resu) => {
    console.log(resu);
    return 'seguimos';
  })
  .then((x) => console.log('despues de insertar', x))
  .then(muestraTodosLosSeminarios)
  .then((resu) => {
    console.log(resu);
    return puntuaA('Luisito', 7, 5, '28/04/2026, 17:45:00');
  })
  .then(() => puntuaA('Luisito', 8, 9, '28/04/2026, 18:30:00'))
  .then(() => mostrarLasPuntuacionesDe('Luisito'))
  .then((resu) => {
    console.log(resu);
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.close());
