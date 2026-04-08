console.log('Hola mundozxc')

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// sendFile will go here
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/views/portada.html'));
});

app.get('/puntuaciones', function(req, res) {
  res.sendFile(path.join(__dirname, '/views/puntuaciones.html'));
});

app.get('/puntuar', function(req, res) {
  res.sendFile(path.join(__dirname, '/views/puntuar.html'));
});

app.listen(port);
console.log('Server started at http://localhost:' + port);