const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// GET /api/parameters - List all parameters
router.get('/', authenticateToken, (req, res) => {
  const params = db.prepare('SELECT * FROM payroll_parameters ORDER BY id ASC').all();
  res.json(params);
});

// GET /api/parameters/history - History of parameter modifications
router.get('/history', authenticateToken, (req, res) => {
  const history = db.prepare(`
    SELECT ph.*, u.full_name as changed_by_name
    FROM parameter_history ph
    LEFT JOIN users u ON ph.user_id = u.id
    ORDER BY ph.changed_at DESC
  `).all();
  res.json(history);
});

// PUT /api/parameters/:code - Update a parameter (ADMIN only)
router.put('/:code', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const { code } = req.params;
  const { value, reason, effectiveStartDate } = req.body;

  if (value === undefined || isNaN(Number(value))) {
    return res.status(400).json({ error: 'El valor numérico es requerido' });
  }

  const current = db.prepare('SELECT * FROM payroll_parameters WHERE code = ?').get(code);
  if (!current) {
    return res.status(404).json({ error: 'Parámetro no encontrado' });
  }

  const prevVal = current.value;
  const newVal = Number(value);

  try {
    const updateTx = db.transaction(() => {
      // 1. Update parameter
      db.prepare(`
        UPDATE payroll_parameters SET
          value = ?,
          effective_start_date = COALESCE(?, effective_start_date),
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE code = ?
      `).run(newVal, effectiveStartDate || null, req.user.id, code);

      // 2. Insert to parameter_history
      db.prepare(`
        INSERT INTO parameter_history (parameter_code, previous_value, new_value, reason, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(code, prevVal, newVal, reason || 'Actualización de normativa/parámetro', req.user.id);
    });

    updateTx();

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'UPDATE_PARAMETER',
      entity: 'PARAMETER',
      entityId: code,
      oldValues: { value: prevVal },
      newValues: { value: newVal, reason },
      ipAddress: req.ip
    });

    res.json({
      message: `Parámetro ${current.name} actualizado correctamente a ${newVal}${current.unit}`,
      code,
      previousValue: prevVal,
      newValue: newVal
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
