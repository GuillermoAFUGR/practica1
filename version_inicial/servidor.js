const express = require('express');
const path = require('path');
const nunjucks = require('nunjucks');
const { connectDB } = require('./model/db');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));

nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app,
  watch: true,
  noCache: true,
});

app.use('/', require('./routes/seminarios'));

async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log('🚀 Servidor en http://localhost:' + port);
  });
}

startServer().catch((error) => {
  console.error('No se pudo arrancar el servidor:', error.message);
  process.exit(1);
});
