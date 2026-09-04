const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

function firmarAccessToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, username: usuario.username, rol: usuario.rol },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function firmarRefreshToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS }
  );
}

// Router de autenticación real (JWT). Convive con la ruta GET /api/login existente
// (demo académica de caché de sesión en Redis) porque usa otro verbo HTTP sobre la misma ruta.
module.exports = function crearRouterAuth({ Usuario, redisClient }) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(422).json({
        errors: [
          ...(!username ? [{ field: 'username', message: 'El usuario es obligatorio.' }] : []),
          ...(!password ? [{ field: 'password', message: 'La contraseña es obligatoria.' }] : []),
        ],
      });
    }

    const usuario = await Usuario.findOne({ where: { username } });
    const passwordValida = usuario ? await bcrypt.compare(password, usuario.password) : false;

    if (!usuario || !passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const accessToken = firmarAccessToken(usuario);
    const refreshToken = firmarRefreshToken(usuario);

    await redisClient.setEx(`refresh:${usuario.id}`, REFRESH_TOKEN_TTL_SECONDS, refreshToken);

    console.log(`\n🔐 Usuario ${usuario.username} (${usuario.rol}) inició sesión con JWT.`);

    res.json({
      accessToken,
      refreshToken,
      usuario: { id: usuario.id, username: usuario.username, rol: usuario.rol },
    });
  });

  router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(401).json({ error: 'Falta el refresh token.' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado.' });
    }

    const refreshGuardado = await redisClient.get(`refresh:${payload.sub}`);
    if (refreshGuardado !== refreshToken) {
      return res.status(401).json({ error: 'La sesión fue cerrada o el token fue revocado.' });
    }

    const usuario = await Usuario.findByPk(payload.sub);
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    res.json({ accessToken: firmarAccessToken(usuario) });
  });

  router.post('/logout', async (req, res) => {
    const { usuarioId } = req.body || {};
    if (usuarioId) {
      await redisClient.del(`refresh:${usuarioId}`);
    }
    res.json({ mensaje: 'Sesión cerrada.' });
  });

  return router;
};
