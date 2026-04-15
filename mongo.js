require('dotenv').config();

const { MongoClient } = require('mongodb');

const mongodbUri =
  process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/';
const databaseName = process.env.MONGODB_DB_NAME || 'puntuaciones';

let client;
let database;
let connectionPromise;

async function connectToDatabase() {
  if (database) {
    return database;
  }

  if (!connectionPromise) {
    client = new MongoClient(mongodbUri);
    connectionPromise = client
      .connect()
      .then((connectedClient) => {
        database = connectedClient.db(databaseName);
        return database;
      })
      .catch((error) => {
        connectionPromise = null;
        client = null;
        throw error;
      });
  }

  return connectionPromise;
}

function getDatabase() {
  if (!database) {
    throw new Error('La conexion con MongoDB todavia no esta lista.');
  }

  return database;
}

function getSeminariosCollection() {
  return getDatabase().collection('seminarios');
}

function getPuntuacionesCollection() {
  return getDatabase().collection('puntuaciones');
}

async function closeDatabase() {
  if (client) {
    await client.close();
  }

  client = null;
  database = null;
  connectionPromise = null;
}

module.exports = {
  connectToDatabase,
  getSeminariosCollection,
  getPuntuacionesCollection,
  closeDatabase,
};
