const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// GET /api/audit
router.get('/', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { limit = 100, offset = 0, entity, action, search } = req.query;

  const result = AuditService.getLogs({
    limit: Math.min(200, Number(limit) || 100),
    offset: Number(offset) || 0,
    entity,
    action,
    search
  });

  res.json(result);
});

module.exports = router;
