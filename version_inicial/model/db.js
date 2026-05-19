const { buildMongoUrl, getEnv } = require('../config/env');
const { MongoClient } = require('mongodb');

const url = buildMongoUrl();
const client = new MongoClient(url);
const dbName = getEnv('MONGODB_DB_NAME', 'puntuaciones');

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
