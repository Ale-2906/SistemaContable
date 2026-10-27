const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mysubs-super-secure-jwt-secret-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.full_name, u.is_active, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? AND u.is_active = 1
    `).get(decoded.id);

    if (!user) {
      return res.status(403).json({ error: 'Usuario no encontrado o inactivo' });
    }

    req.user = user;
    next();
  });
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado: Su rol (${req.user.role}) no tiene permisos para esta acción`
      });
    }

    next();
  };
}

function maskAccountNumber(acc) {
  if (!acc) return '****';
  const str = String(acc).trim();
  if (str.length <= 4) return '****' + str;
  return '*'.repeat(str.length - 4) + str.slice(-4);
}

module.exports = {
  authenticateToken,
  requireRole,
  maskAccountNumber,
  JWT_SECRET
};
