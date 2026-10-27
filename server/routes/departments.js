const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// GET /api/departments
router.get('/', authenticateToken, (req, res) => {
  const departments = db.prepare(`
    SELECT d.*, COUNT(e.id) as employee_count
    FROM departments d
    LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'ACTIVO'
    GROUP BY d.id
    ORDER BY d.name ASC
  `).all();
  res.json(departments);
});

// POST /api/departments (ADMIN, RRHH)
router.post('/', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { name, code, description } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Nombre y código de departamento son obligatorios' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO departments (name, code, description)
      VALUES (?, ?, ?)
    `).run(name.trim(), code.trim().toUpperCase(), description || '');

    res.status(201).json({ message: 'Departamento creado', id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un departamento con ese código' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/salary-scales', authenticateToken, (req,res)=>{
 const scales=db.prepare(`SELECT s.*,COUNT(DISTINCT p.id) AS position_count,COUNT(e.id) AS employee_count,
 SUM(CASE WHEN e.id IS NOT NULL AND (e.base_salary<p.salary_min OR e.base_salary>p.salary_max) THEN 1 ELSE 0 END) AS out_of_range_count
 FROM salary_scales s LEFT JOIN positions p ON p.salary_grade=s.code
 LEFT JOIN employees e ON e.position_id=p.id AND e.status='ACTIVO'
 GROUP BY s.code ORDER BY s.sort_order`).all();
 res.json(scales);
});

// GET /api/departments/positions (all positions)
router.get('/positions', authenticateToken, (req, res) => {
  const positions = db.prepare(`
    SELECT p.*,
           d.name as department_name,
           lr.name as labor_regime_name,
           ws.name as default_schedule_name,
           sc.label AS salary_grade_name,
           COUNT(e.id) as employee_count,
           SUM(CASE WHEN e.id IS NOT NULL AND (e.base_salary<p.salary_min OR e.base_salary>p.salary_max) THEN 1 ELSE 0 END) AS out_of_range_count
    FROM positions p
    JOIN departments d ON p.department_id = d.id
    LEFT JOIN labor_regimes lr ON p.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON p.default_schedule_id = ws.id
    LEFT JOIN salary_scales sc ON sc.code=p.salary_grade
    LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'ACTIVO'
    GROUP BY p.id
    ORDER BY d.name ASC, p.name ASC
  `).all();
  res.json(positions);
});

function savePosition(req, res) {
  const current = req.params.id ? db.prepare('SELECT * FROM positions WHERE id=?').get(req.params.id) : null;
  if (req.params.id && !current) return res.status(404).json({ error: 'Cargo no encontrado' });
  const b = req.body;
  const department = Number(b.departmentId), salary = Number(b.baseSalary);
  const min = b.salaryMin === '' || b.salaryMin == null ? salary : Number(b.salaryMin);
  const max = b.salaryMax === '' || b.salaryMax == null ? salary : Number(b.salaryMax);
  const parent = b.parentPositionId ? Number(b.parentPositionId) : null;
  const referenceUnchanged=current && Number(current.base_salary)===salary;
  if (!b.name?.trim() || !db.prepare('SELECT id FROM departments WHERE id=?').get(department) ||
      ![salary,min,max].every(Number.isFinite) || min < 0 || max < min || salary < 0 || (!referenceUnchanged && (salary < min || salary > max))) {
    return res.status(400).json({ error: 'Indique departamento y nombre válidos; el sueldo debe estar dentro de la escala mínima y máxima.' });
  }
  const grade=b.salaryGrade ? db.prepare('SELECT * FROM salary_scales WHERE code=?').get(b.salaryGrade) : null;
  if(grade && (min<grade.min_salary || max>grade.max_salary)) return res.status(400).json({error:`El rango del cargo debe estar dentro de ${grade.code}: $${grade.min_salary} a $${grade.max_salary}`});
  if (parent) {
    let ancestor = parent; const seen = new Set([Number(req.params.id)]);
    while (ancestor) {
      if (seen.has(ancestor)) return res.status(400).json({ error: 'La jerarquía no puede contener ciclos' });
      seen.add(ancestor);
      const row = db.prepare('SELECT parent_position_id FROM positions WHERE id=?').get(ancestor);
      if (!row) return res.status(400).json({ error: 'Cargo superior inexistente' });
      ancestor = row.parent_position_id;
    }
  }
  try {
    const values = [department,b.name.trim().toUpperCase(),b.description || '',b.laborRegimeId || null,b.defaultScheduleId || null,salary,parent,b.salaryGrade || '',min,max];
    let id = current?.id;
    if (current) db.prepare('UPDATE positions SET department_id=?,name=?,description=?,labor_regime_id=?,default_schedule_id=?,base_salary=?,parent_position_id=?,salary_grade=?,salary_min=?,salary_max=? WHERE id=?').run(...values,id);
    else id = db.prepare('INSERT INTO positions (department_id,name,description,labor_regime_id,default_schedule_id,base_salary,parent_position_id,salary_grade,salary_min,salary_max) VALUES (?,?,?,?,?,?,?,?,?,?)').run(...values).lastInsertRowid;
    AuditService.log({ userId: req.user.id, userEmail: req.user.email, action: current ? 'UPDATE_POSITION' : 'CREATE_POSITION', entity: 'POSITION', entityId: id, oldValues: current, newValues: b, ipAddress: req.ip });
    res.status(current ? 200 : 201).json({ id, message: 'Cargo y escala salarial guardados' });
  } catch (err) { res.status(400).json({ error: err.message }); }
}
router.post('/positions', authenticateToken, requireRole(['ADMIN','RRHH']), savePosition);
router.put('/positions/:id', authenticateToken, requireRole(['ADMIN','RRHH']), savePosition);
module.exports = router;
