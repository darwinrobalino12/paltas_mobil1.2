const jwt = require('jsonwebtoken');

// 401: no autenticado (falta token o es inválido/expirado)
function verificarJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Falta el token de acceso.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.usuario = { id: payload.sub, username: payload.username, rol: payload.rol };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token de acceso inválido o expirado.' });
  }
}

// 403: autenticado, pero sin el rol requerido
function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autorizado.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
    }
    next();
  };
}

module.exports = { verificarJWT, requiereRol };
