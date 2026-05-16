const { MongoClient } = require('mongodb');

const url = 'mongodb://root:example@localhost:27017/';
const client = new MongoClient(url);
const dbName = 'puntuaciones';

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('Conectado a MongoDB');
  } catch (err) {
    console.error('Error de conexion:', err);
    throw err;
  }
}

function getDb() {
  return db;
}

module.exports = { connectDB, getDb };
