const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/schedules - List work schedules
router.get('/', authenticateToken, (req, res) => {
  const list = db.prepare('SELECT * FROM work_schedules WHERE is_active = 1 ORDER BY id ASC').all();
  res.json(list);
});

// POST /api/schedules - Create new work schedule (ADMIN, RRHH)
router.post('/', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { name, startTime, endTime, dailyHours = 8.0, scheduleType = 'DIURNA', description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nombre de la jornada requerido' });
  }

  const result = db.prepare(`
    INSERT INTO work_schedules (name, start_time, end_time, daily_hours, schedule_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), startTime || null, endTime || null, Number(dailyHours), scheduleType, description || '');

  res.status(201).json({ message: 'Jornada creada exitosamente', id: result.lastInsertRowid });
});

module.exports = router;
