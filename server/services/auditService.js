const db = require('../config/database');

class AuditService {
  static log({ userId, userEmail, action, entity, entityId, oldValues, newValues, ipAddress }) {
    try {
      const stmt = db.prepare(`
        INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, old_values, new_values, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId || null,
        userEmail || null,
        action,
        entity,
        entityId ? String(entityId) : null,
        oldValues ? (typeof oldValues === 'object' ? JSON.stringify(oldValues) : oldValues) : null,
        newValues ? (typeof newValues === 'object' ? JSON.stringify(newValues) : newValues) : null,
        ipAddress || '127.0.0.1'
      );
    } catch (error) {
      console.error('Audit log error:', error.message);
    }
  }

  static getLogs({ limit = 100, offset = 0, entity = null, action = null, search = null }) {
    let query = `
      SELECT al.*, u.full_name as user_full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (entity) {
      query += ` AND al.entity = ?`;
      params.push(entity);
    }

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (search) {
      query += ` AND (al.action LIKE ? OR al.entity LIKE ? OR al.user_email LIKE ? OR al.entity_id LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);

    const countQuery = `SELECT COUNT(*) as total FROM audit_logs`;
    const total = db.prepare(countQuery).get().total;

    return { rows, total };
  }
}

module.exports = AuditService;
