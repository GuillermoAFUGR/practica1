const express = require('express');
const { getDb } = require('../model/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const coleccionSeminarios = db.collection('seminarios');
    const seminarios = await coleccionSeminarios.find({}).toArray();

    res.render('portada.html', {
      seminarios,
      aviso: req.query.ok ? 'Puntuacion enviada correctamente.' : null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/puntuar', async (req, res, next) => {
  try {
    const db = getDb();
    const coleccionSeminarios = db.collection('seminarios');
    const autor = req.query.seminario_de;
    const seminario = await coleccionSeminarios.findOne({ autor });

    res.render('puntuar.html', { seminario, error: null, valores: {} });
  } catch (error) {
    next(error);
  }
});

router.post('/puntuar', async (req, res, next) => {
  try {
    const db = getDb();
    const coleccionSeminarios = db.collection('seminarios');
    const coleccionPuntuaciones = db.collection('puntuaciones');
    const { autor, utilidad, calidad } = req.body;

    console.log(
      `Los parametros que llegan: autor:${autor}, utilidad:${utilidad}, calidad:${calidad}`
    );

    const seminario = await coleccionSeminarios.findOne({ autor });
    const utilidadNumero = Number(utilidad);
    const calidadNumero = Number(calidad);

    const utilidadValida =
      Number.isFinite(utilidadNumero) && utilidadNumero >= 0 && utilidadNumero <= 10;
    const calidadValida =
      Number.isFinite(calidadNumero) && calidadNumero >= 0 && calidadNumero <= 10;

    if (!utilidadValida || !calidadValida) {
      return res.status(400).render('puntuar.html', {
        seminario,
        error: 'Calidad y utilidad deben ser numeros entre 0 y 10.',
        valores: {
          calidad,
          utilidad,
        },
      });
    }

    await coleccionPuntuaciones.insertOne({
      seminario_de: autor,
      utilidad: utilidadNumero,
      calidad: calidadNumero,
      fecha: new Date().toLocaleString('es-ES'),
    });

    res.redirect('/?ok=1');
  } catch (error) {
    next(error);
  }
});

router.get('/ver-puntuaciones', async (req, res, next) => {
  try {
    const db = getDb();
    const coleccionSeminarios = db.collection('seminarios');
    const coleccionPuntuaciones = db.collection('puntuaciones');
    const autor = req.query.seminario_de;
    const seminario = await coleccionSeminarios.findOne({ autor });
    const puntuaciones = await coleccionPuntuaciones.find({ seminario_de: autor }).toArray();

    let suma = 0;

    puntuaciones.forEach((puntuacion) => {
      suma += Number(puntuacion.calidad || 0) + Number(puntuacion.utilidad || 0);
    });

    const media = puntuaciones.length ? (suma / (puntuaciones.length * 2)).toFixed(1) : '0.0';

    res.render('resultados.html', {
      seminario,
      puntuaciones,
      media,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
