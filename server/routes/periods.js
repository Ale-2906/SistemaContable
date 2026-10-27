const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// GET /api/periods
router.get('/', authenticateToken, (req, res) => {
  const periods = db.prepare(`
    SELECT p.*,
           (SELECT COUNT(*) FROM payrolls WHERE period_id = p.id) as payroll_count,
           (SELECT COALESCE(SUM(total_income), 0) FROM payrolls WHERE period_id = p.id) as total_payroll_income,
           (SELECT COALESCE(SUM(net_salary), 0) FROM payrolls WHERE period_id = p.id) as total_net_payout,
           (SELECT COALESCE(SUM(employer_contributions), 0) FROM payrolls WHERE period_id = p.id) as total_employer_cost
    FROM pay_periods p
    ORDER BY p.start_date DESC
  `).all();

  res.json(periods);
});

// GET /api/periods/:id
router.get('/:id', authenticateToken, (req, res) => {
  const period = db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(req.params.id);
  if (!period) {
    return res.status(404).json({ error: 'Período no encontrado' });
  }
  res.json(period);
});

// POST /api/periods (ADMIN, RRHH)
router.post('/', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { name, startDate, endDate, paymentDate, notes } = req.body;
  if (!name || !startDate || !endDate || !paymentDate) {
    return res.status(400).json({ error: 'Nombre, fecha inicial, final y de pago son obligatorios' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO pay_periods (name, start_date, end_date, payment_date, status, notes)
      VALUES (?, ?, ?, ?, 'ABIERTO', ?)
    `).run(name.trim(), startDate, endDate, paymentDate, notes || '');

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CREATE_PERIOD',
      entity: 'PERIOD',
      entityId: result.lastInsertRowid,
      newValues: { name, startDate, endDate, paymentDate },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Período de nómina creado en estado ABIERTO', id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un período con ese nombre' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/periods/:id/status (ADMIN, RRHH)
router.put('/:id/status', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const periodId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['ABIERTO', 'CALCULADO', 'CERRADO', 'PAGADO'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  const current = db.prepare('SELECT status FROM pay_periods WHERE id = ?').get(periodId);
  if (!current) {
    return res.status(404).json({ error: 'Período no encontrado' });
  }

  if (['CERRADO', 'PAGADO'].includes(current.status)) {
    return res.status(409).json({ error: 'Un periodo aprobado o pagado no puede cambiarse manualmente' });
  }
  if (status !== 'ABIERTO') {
    return res.status(409).json({ error: 'El estado se actualiza al generar, aprobar o pagar la nomina' });
  }

  db.prepare('UPDATE pay_periods SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, periodId);

  AuditService.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'STATUS_CHANGE',
    entity: 'PERIOD',
    entityId: periodId,
    oldValues: { status: current.status },
    newValues: { status },
    ipAddress: req.ip
  });

  res.json({ message: `Estado actualizado a ${status}`, status });
});

module.exports = router;
