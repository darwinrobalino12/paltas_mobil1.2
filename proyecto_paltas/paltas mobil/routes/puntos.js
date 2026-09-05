const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { verificarJWT, requiereRol } = require('../middlewares/auth');

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24h

const CARPETA_UPLOADS = path.join(__dirname, '..', 'uploads', 'puntos');
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

function aNumeroOpcional(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

function validarPunto({ nombre, descripcion, categoriaId, latitud, longitud }, categoriaExiste) {
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

  if (latitud !== undefined && (latitud === null || latitud < -90 || latitud > 90)) {
    errors.push({ field: 'latitud', message: 'La latitud debe ser un número entre -90 y 90.' });
  }

  if (longitud !== undefined && (longitud === null || longitud < -180 || longitud > 180)) {
    errors.push({ field: 'longitud', message: 'La longitud debe ser un número entre -180 y 180.' });
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

  // multipart/form-data: campos de texto (nombre, descripcion, categoriaId, latitud,
  // longitud) + archivo opcional "imagen". La foto siempre viaja en línea (no pasa
  // por la cola offline), por eso este endpoint no necesita lógica adicional para eso.
  router.post('/puntos-interes', verificarJWT, requiereRol('admin'), upload.single('imagen'), async (req, res) => {
    const { nombre, descripcion, categoriaId: categoriaIdRaw } = req.body || {};
    const categoriaId = aNumeroOpcional(categoriaIdRaw);
    const latitud = aNumeroOpcional(req.body?.latitud);
    const longitud = aNumeroOpcional(req.body?.longitud);

    const categoriaExiste = categoriaId ? Boolean(await Categoria.findByPk(categoriaId)) : false;
    const errors = validarPunto({ nombre, descripcion, categoriaId, latitud, longitud }, categoriaExiste);

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

    const imagenUrl = req.file ? `/uploads/puntos/${req.file.filename}` : null;

    const nuevoPunto = await PuntoInteres.create({
      nombre: nombre.trim(),
      descripcion: descripcion || null,
      categoriaId,
      latitud: latitud ?? null,
      longitud: longitud ?? null,
      imagenUrl,
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
