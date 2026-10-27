const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken, requireRole, JWT_SECRET } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Por favor ingrese su usuario o correo y contraseña' });
  }

  const user = db.prepare(`
    SELECT u.*, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE (u.email = ? OR u.username = ?) AND u.is_active = 1
  `).get(identifier.trim().toLowerCase(), identifier.trim());

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    AuditService.log({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_FAILED',
      entity: 'USER',
      entityId: user.id,
      ipAddress: req.ip
    });
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  AuditService.log({
    userId: user.id,
    userEmail: user.email,
    action: 'LOGIN_SUCCESS',
    entity: 'USER',
    entityId: user.id,
    newValues: { role: user.role_name },
    ipAddress: req.ip
  });

  res.json({
    message: 'Inicio de sesión exitoso',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role_name
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role
    }
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  AuditService.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'LOGOUT',
    entity: 'USER',
    entityId: req.user.id,
    ipAddress: req.ip
  });
  res.json({ message: 'Sesión cerrada correctamente' });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Correo y nueva contraseña requeridos' });
  }

  const user = db.prepare('SELECT id, email FROM users WHERE email = ? AND is_active = 1').get(email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'No se encontró un usuario con ese correo electrónico' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, user.id);

  AuditService.log({
    userId: user.id,
    userEmail: user.email,
    action: 'PASSWORD_RESET',
    entity: 'USER',
    entityId: user.id,
    ipAddress: req.ip
  });

  res.json({ message: 'Contraseña restablecida exitosamente. Ahora puede iniciar sesión.' });
});

module.exports = router;
