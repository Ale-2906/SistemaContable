const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// GET /api/payments - List all payment batches
router.get('/', authenticateToken, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*,
           pp.name as period_name,
           pp.start_date as period_start_date,
           pp.end_date as period_end_date,
           u_cr.full_name as created_by_name
    FROM payments p
    JOIN pay_periods pp ON p.period_id = pp.id
    LEFT JOIN users u_cr ON p.created_by = u_cr.id
    ORDER BY p.payment_date DESC, p.id DESC
  `).all();

  res.json(payments);
});

// GET /api/payments/:id - Get payment batch with employee items
router.get('/:id', authenticateToken, (req, res) => {
  const payment = db.prepare(`
    SELECT p.*,
           pp.name as period_name,
           pp.start_date as period_start_date,
           pp.end_date as period_end_date,
           pp.status as period_status
    FROM payments p
    JOIN pay_periods pp ON p.period_id = pp.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!payment) {
    return res.status(404).json({ error: 'Lote de pago no encontrado' });
  }

  const items = db.prepare(`
    SELECT pi.*,
           e.cedula as employee_cedula,
           e.first_name || ' ' || e.last_name as employee_name,
           d.name as department_name,
           pos.name as position_name
    FROM payment_items pi
    JOIN employees e ON pi.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    JOIN positions pos ON e.position_id = pos.id
    WHERE pi.payment_id = ?
    ORDER BY pi.id ASC
  `).all(payment.id);

  res.json({ payment, items });
});

// PUT /api/payments/:id/mark-paid - Mark entire batch as paid (ADMIN, RRHH)
router.put('/:id/mark-paid', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const paymentId = req.params.id;
  const { paymentMethod = 'TRANSFERENCIA', referencePrefix = 'SPI-MYSUBS', notes } = req.body;

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  if (!payment) {
    return res.status(404).json({ error: 'Lote no encontrado' });
  }

  if (payment.status !== 'PENDIENTE') {
    return res.status(409).json({ error: 'El lote ya fue pagado o no esta pendiente' });
  }
  const details = db.prepare(`
    SELECT pi.amount, pr.status AS payroll_status
    FROM payment_items pi JOIN payrolls pr ON pr.id = pi.payroll_id
    WHERE pi.payment_id = ?
  `).all(paymentId);
  const totalCents = details.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  if (!details.length || details.length !== payment.total_employees ||
      details.some(item => item.payroll_status !== 'APROBADO') ||
      totalCents !== Math.round(payment.total_amount * 100)) {
    return res.status(409).json({ error: 'El lote debe contener roles aprobados e importes consistentes antes de registrar el pago' });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE payments SET
        status = 'PAGADO',
        processed_at = CURRENT_TIMESTAMP,
        notes = ?
      WHERE id = ?
    `).run(notes || `Pagado vía ${paymentMethod}`, paymentId);

    const items = db.prepare('SELECT id FROM payment_items WHERE payment_id = ?').all(paymentId);
    let counter = 1001;
    const updItem = db.prepare(`
      UPDATE payment_items SET
        status = 'PAGADO',
        payment_method = ?,
        reference_number = ?,
        paid_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const it of items) {
      updItem.run(paymentMethod, `${referencePrefix}-${counter++}`, it.id);
    }

    db.prepare(`
      UPDATE payrolls SET status = 'PAGADO', updated_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT payroll_id FROM payment_items WHERE payment_id = ?)
    `).run(paymentId);

    db.prepare("UPDATE pay_periods SET status = 'PAGADO', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(payment.period_id);
  });

  try {
    tx();

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'PAYMENT_PROCESSED',
      entity: 'PAYMENT',
      entityId: paymentId,
      newValues: { status: 'PAGADO', method: paymentMethod, total: payment.total_amount },
      ipAddress: req.ip
    });

    res.json({ message: 'Lote de pagos registrado como PAGADO exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
