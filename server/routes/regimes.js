const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/regimes - List labor regimes
router.get('/', authenticateToken, (req, res) => {
  const list = db.prepare('SELECT * FROM labor_regimes WHERE is_active = 1 ORDER BY id ASC').all();
  res.json(list);
});

// POST /api/regimes - Create labor regime (ADMIN only)
router.post('/', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Código y nombre son requeridos' });
  }

  const result = db.prepare('INSERT INTO labor_regimes (code, name, description) VALUES (?, ?, ?)')
    .run(code.trim().toUpperCase(), name.trim(), description || '');

  res.status(201).json({ message: 'Régimen laboral registrado', id: result.lastInsertRowid });
});

module.exports = router;
