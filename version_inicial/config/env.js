const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadEnvFile() {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const fileContent = fs.readFileSync(envPath, 'utf8');
  const lines = fileContent.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmedLine.slice(separatorIndex + 1).trim());

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function buildMongoUrl() {
  const username = getEnv('MONGO_ROOT_USERNAME', 'root');
  const password = getEnv('MONGO_ROOT_PASSWORD', 'example');
  const host = getEnv('MONGO_HOST', 'localhost');
  const port = getEnv('MONGO_PORT', '27017');

  return `mongodb://${username}:${password}@${host}:${port}/`;
}

loadEnvFile();

module.exports = {
  buildMongoUrl,
  getEnv,
};
