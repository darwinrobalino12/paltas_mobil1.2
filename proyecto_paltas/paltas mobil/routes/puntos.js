const express = require('express');
const { verificarJWT, requiereRol } = require('../middlewares/auth');

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24h

function validarPunto({ nombre, descripcion, categoriaId }, categoriaExiste) {
  const errors = [];
  const nombreTexto = typeof nombre === 'string' ? nombre.trim() : '';

  if (nombreTexto.length < 3 || nombreTexto.length > 100) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio y debe tener entre 3 y 100 caracteres.' });
  }

  if (descripcion !== undefined && descripcion !== null && descripcion !== '') {
    if (typeof descripcion !== 'string' || descripcion.length > 500) {
      errors.push({ field: 'descripcion', message: 'La descripción no puede superar los 500 caracteres.' });
    }
  }

  if (categoriaId === undefined || categoriaId === null || categoriaId === '') {
    errors.push({ field: 'categoriaId', message: 'Debes seleccionar una categoría.' });
  } else if (!categoriaExiste) {
    errors.push({ field: 'categoriaId', message: 'La categoría seleccionada no existe.' });
  }

  return errors;
}

module.exports = function crearRouterPuntos({ PuntoInteres, Categoria, redisClient }) {
  const router = express.Router();

  // Permite reconstruir DetallePuntoScreen desde su dirección (solo el id), sin depender
  // de datos pasados por navegación.
  router.get('/puntos-interes/:id', async (req, res) => {
    const punto = await PuntoInteres.findByPk(req.params.id, {
      include: { model: Categoria, as: 'categoria', attributes: ['nombre'] },
    });

    if (!punto) {
      return res.status(404).json({ error: 'Punto de interés no encontrado.' });
    }

    res.json(punto);
  });

  router.post('/puntos-interes', verificarJWT, requiereRol('admin'), async (req, res) => {
    const { nombre, descripcion, categoriaId } = req.body || {};

    const categoriaExiste = categoriaId ? Boolean(await Categoria.findByPk(categoriaId)) : false;
    const errors = validarPunto({ nombre, descripcion, categoriaId }, categoriaExiste);

    if (errors.length > 0) {
      return res.status(422).json({ errors });
    }

    // Idempotencia: si el cliente reenvía la misma operación de la cola offline
    // (misma Idempotency-Key), se devuelve el resultado ya creado en vez de duplicar.
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const cacheada = await redisClient.get(`idem:${idempotencyKey}`);
      if (cacheada) {
        return res.status(201).json(JSON.parse(cacheada));
      }
    }

    const nuevoPunto = await PuntoInteres.create({
      nombre: nombre.trim(),
      descripcion: descripcion || null,
      categoriaId,
    });

    const puntoConCategoria = await PuntoInteres.findByPk(nuevoPunto.id, {
      include: { model: Categoria, as: 'categoria', attributes: ['nombre'] },
    });

    if (idempotencyKey) {
      await redisClient.setEx(`idem:${idempotencyKey}`, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(puntoConCategoria));
    }

    console.log(`\n✅ Punto de interés creado por ${req.usuario.username}: ${nuevoPunto.nombre}`);

    res.status(201).json(puntoConCategoria);
  });

  return router;
};
