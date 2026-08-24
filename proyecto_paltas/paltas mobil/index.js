const express = require('express');
const { createClient } = require('redis');
const Queue = require('bull');
const sequelize = require('./config/database');
const Categoria = require('./models/Categoria');
const PuntoInteres = require('./models/PuntoInteres');
const Usuario = require('./models/Usuario'); 

const app = express();
app.use(express.json());

// Configuración del cliente de Redis para Caché
const redisClient = createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('❌ Error en Redis Client', err));

// Configuración de la Cola de Trabajo con Redis
const reporteCola = new Queue('procesar-reporte', 'redis://127.0.0.1:6379');

// WORKER: El procesador de la cola en segundo plano
reporteCola.process(async (job) => {
  console.log(`\n👷 Worker: Iniciando tarea pesada #${job.id} para el usuario: ${job.data.usuario}...`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(`✅ Worker: Tarea #${job.id} COMPLETADA. Reporte enviado por correo.`);
  return { resultado: "Reporte de Paltas generado con éxito" };
});

// ==========================================
// MIDDLEWARE: Autenticación Eficiente sin Consultas Redundantes
// ==========================================
async function verificarAutenticacion(req, res, next) {
  const token = req.query.token || req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Falta el token.' });
  }

  try {
    // Verificamos PRIMERO en Redis si la sesión está guardada
    const sesionEnCache = await redisClient.get(`sesion:${token}`);

    if (sesionEnCache) {
      // ESTE MENSAJE SE MOSTRARÁ EN TU TERMINAL EN VIVO
      console.log('\n🛡️  Auth Middleware: Usuario validado desde CACHÉ (0 consultas a MySQL) ⚡');
      req.usuario = JSON.parse(sesionEnCache);
      return next();
    }

    console.log('\n🔍 Auth Middleware: Buscando sesión en la Base de Datos... (Lento)');
    const usuario = await Usuario.findOne({ where: { username: token } });

    if (!usuario) {
      return res.status(401).json({ error: 'Token o sesión inválida.' });
    }

    await redisClient.setEx(`sesion:${token}`, 300, JSON.stringify(usuario));
    req.usuario = usuario;
    next();

  } catch (error) {
    res.status(500).json({ error: 'Error en la validación de seguridad.' });
  }
}

// ==========================================
// SEEDER: Insertar datos de prueba automáticamente
// ==========================================
async function sembrarDatos() {
  const count = await Categoria.count();
  if (count === 0) {
    const cat1 = await Categoria.create({ nombre: 'Cultural' });
    const cat2 = await Categoria.create({ nombre: 'Gastronómico' });
    const cat3 = await Categoria.create({ nombre: 'Natural' });

    await PuntoInteres.create({ nombre: 'Iglesia Central de Paltas', descripcion: 'Hermoso patrimonio histórico.', categoriaId: cat1.id });
    await PuntoInteres.create({ nombre: 'Restaurante El Paltense', descripcion: 'Comida típica de la región.', categoriaId: cat2.id });
    await PuntoInteres.create({ nombre: 'Mirador El Shiriculapo', descripcion: 'Vista panorámica impresionante.', categoriaId: cat3.id });

    await Usuario.create({ username: 'petri', password: 'password123' });
    console.log('🌱 Datos de prueba e inserción de usuario listos.');
  }
}

// ==========================================
// RUTAS DE LA API
// ==========================================

app.get('/login', async (req, res) => {
  const username = req.query.username || 'petri';
  const password = req.query.password || 'password123';

  const usuario = await Usuario.findOne({ where: { username, password } });

  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  await redisClient.setEx(`sesion:${usuario.username}`, 300, JSON.stringify(usuario));

  // ESTE MENSAJE SE MOSTRARÁ EN TU TERMINAL EN VIVO
  console.log(`\n🔐 Usuario ${usuario.username} inició sesión. Sesión guardada en Redis.`);
  
  res.json({
    mensaje: "¡Inicio de sesión exitoso!",
    token: usuario.username,
    explicacion: "Tu sesión ha sido guardada en la caché de Redis por 5 minutos."
  });
});

app.get('/puntos-lento', async (req, res) => {
  console.time('⏱️ Tiempo Ruta N+1');
  const puntos = await PuntoInteres.findAll();
  const resultado = [];
  for (const punto of puntos) {
    const categoria = await Categoria.findByPk(punto.categoriaId);
    resultado.push({ id: punto.id, nombre: punto.nombre, descripcion: punto.descripcion, categoria: categoria ? categoria.nombre : null });
  }
  console.timeEnd('⏱️ Tiempo Ruta N+1');
  res.json(resultado);
});

app.get('/puntos-rapido', async (req, res) => {
  console.time('⚡ Tiempo Ruta Optimizada');
  const puntos = await PuntoInteres.findAll({
    include: { model: Categoria, as: 'categoria', attributes: ['nombre'] }
  });
  console.timeEnd('⚡ Tiempo Ruta Optimizada');
  
  // ESTE MENSAJE SE MOSTRARÁ EN TU TERMINAL EN VIVO
  console.log('⚡ Ruta Optimizada: Consulta realizada con un único JOIN exitoso.');
  
  res.json(puntos);
});

app.get('/puntos-cache', async (req, res) => {
  const cacheKey = 'puntos:all';
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      // ESTE MENSAJE SE MOSTRARÁ EN TU TERMINAL EN VIVO
      console.log('\n📦 Datos recuperados desde la caché de Redis');
      return res.json(JSON.parse(cachedData));
    }
    const puntos = await PuntoInteres.findAll({
      include: { model: Categoria, as: 'categoria', attributes: ['nombre'] }
    });
    await redisClient.setEx(cacheKey, 60, JSON.stringify(puntos));
    
    // ESTE MENSAJE SE MOSTRARÁ EN TU TERMINAL EN VIVO
    console.log('\n💾 Datos guardados en Redis (Cache Miss)');
    res.json(puntos);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/reporte', async (req, res) => {
  const usuarioDestino = req.query.usuario || 'Petri';
  const trabajo = await reporteCola.add({ usuario: usuarioDestino });
  res.json({ mensaje: "Tu solicitud de reporte está siendo procesada en segundo plano por el Worker.", trabajoId: trabajo.id, usuario: usuarioDestino });
});

app.get('/perfil-seguro', verificarAutenticacion, (req, res) => {
  res.json({
    mensaje: `Bienvenido a tu perfil protegido, ${req.usuario.username}.`,
    datosPrivados: "Información sensible del proyecto Paltas resguardada con éxito."
  });
});
// ==========================================
// RUTA COMPATIBLE PARA LA APP MÓVIL
// ==========================================
app.get('/api/saludo', (req, res) => {
  res.json({
    mensaje: "¡Conexión exitosa con el Taller Paltas!",
    estado: "Servidor operativo con MySQL y Redis",
    autor: "petri"
  });
});

// ==========================================
// ARRANCAR CONEXIONES EN ORDEN SEGURO
// ==========================================
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await redisClient.connect();
    console.log('🛑 Conectado a Redis en Docker con éxito.');

    await sequelize.sync({ force: false });
    console.log('✅ Conectado a MySQL en Docker con éxito.');
    
    await sembrarDatos();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}\n`);
    });
  } catch (error) {
    console.error('❌ Error crítico al iniciar el entorno:', error);
  }
}

iniciarServidor();