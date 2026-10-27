const validateSalary = require('../services/salaryScale');
const express = require('express');
const router = express.Router();
router.use((req, res, next) => {
  if (req.body) {
    const aliases = { first_name: 'firstName', last_name: 'lastName', birth_date: 'birthDate', position_id: 'positionId', department_id: 'departmentId', labor_regime_id: 'laborRegimeId', work_schedule_id: 'workScheduleId', hire_date: 'hireDate', base_salary: 'baseSalary' };
    for (const [from, to] of Object.entries(aliases)) if (req.body[from] !== undefined) req.body[to] = req.body[from];
    if (req.body.tax_year !== undefined && Number(req.body.tax_year) !== 2026) return res.status(400).json({ error: 'Beneficios tributarios: ejercicio 2026 disponible' });
    for (const key of ['decimo13_mode', 'decimo14_mode']) {
      if (req.body[key] !== undefined && !['MENSUAL', 'ANUAL'].includes(req.body[key])) return res.status(400).json({ error: 'Modalidad de décimos inválida' });
    }
    for (const key of ['annual_tax_rebate', 'annual_tax_exemption']) {
      if (req.body[key] !== undefined && (!Number.isFinite(Number(req.body[key])) || Number(req.body[key]) < 0)) return res.status(400).json({ error: 'Valores tributarios inválidos' });
    }
    if (req.body.decimo14_month !== undefined && ![3,8].includes(Number(req.body.decimo14_month))) return res.status(400).json({ error: 'Mes del décimo cuarto inválido' });
  }
  next();
});
function saveBenefits(id, body) {
  const current = db.prepare('SELECT * FROM employees WHERE id=?').get(id);
  db.prepare('UPDATE employees SET decimo13_mode=?, decimo14_mode=?, decimo14_month=?, annual_tax_rebate=?, annual_tax_exemption=? WHERE id=?').run(
    body.decimo13_mode ?? current.decimo13_mode, body.decimo14_mode ?? current.decimo14_mode,
    Number(body.decimo14_month ?? current.decimo14_month), Number(body.annual_tax_rebate ?? current.annual_tax_rebate), Number(body.annual_tax_exemption ?? current.annual_tax_exemption), id);
  db.prepare('UPDATE employees SET tax_year=? WHERE id=?').run(Number(body.tax_year ?? current.tax_year),id);
  db.prepare("UPDATE payrolls SET status='DESACTUALIZADO' WHERE employee_id=? AND status='GENERADO' AND period_id IN (SELECT id FROM pay_periods WHERE status IN ('BORRADOR','ABIERTO','CALCULADO'))").run(id);
}

const db = require('../config/database');
const { authenticateToken, requireRole, maskAccountNumber } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// GET /api/employees - List employees with filters, sorting, search
router.get('/', authenticateToken, (req, res) => {
  const { search, departmentId, regimeId, status, sortBy = 'id', order = 'ASC' } = req.query;

  let query = `
    SELECT e.*,
           e.first_name || ' ' || e.last_name as full_name,
           d.name as department_name,
           p.name as position_name,
           p.salary_grade,p.salary_min,p.salary_max,sc.label AS salary_grade_name,
           lr.name as labor_regime_name,
           ws.name as work_schedule_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN positions p ON e.position_id = p.id
    LEFT JOIN salary_scales sc ON sc.code=p.salary_grade
    LEFT JOIN labor_regimes lr ON e.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ` AND e.status = ?`;
    params.push(status);
  }

  if (departmentId) {
    query += ` AND e.department_id = ?`;
    params.push(departmentId);
  }

  if (regimeId) {
    query += ` AND e.labor_regime_id = ?`;
    params.push(regimeId);
  }

  if (search) {
    query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.cedula LIKE ? OR p.name LIKE ? OR e.email LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  const validSortColumns = ['id', 'first_name', 'last_name', 'cedula', 'base_salary', 'hire_date', 'status'];
  const sortCol = validSortColumns.includes(sortBy) ? `e.${sortBy}` : 'e.id';
  const sortDir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  query += ` ORDER BY ${sortCol} ${sortDir}`;

  const rows = db.prepare(query).all(...params);

  const formatted = rows.map(emp => ({
    ...emp,
    account_number_masked: maskAccountNumber(emp.account_number),
    account_number: ['ADMIN', 'RRHH'].includes(req.user.role) ? emp.account_number : maskAccountNumber(emp.account_number)
  }));

  res.json(formatted);
});

// GET /api/employees/:id
router.get('/:id', authenticateToken, (req, res) => {
  const emp = db.prepare(`
    SELECT e.*,
           e.first_name || ' ' || e.last_name as full_name,
           d.name as department_name,
           p.name as position_name,
           p.salary_grade,p.salary_min,p.salary_max,sc.label AS salary_grade_name,
           lr.name as labor_regime_name,
           ws.name as work_schedule_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN positions p ON e.position_id = p.id
    LEFT JOIN salary_scales sc ON sc.code=p.salary_grade
    LEFT JOIN labor_regimes lr ON e.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    WHERE e.id = ?
  `).get(req.params.id);

  if (!emp) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }

  res.json({
    ...emp,
    account_number_masked: maskAccountNumber(emp.account_number)
  });
});

// POST /api/employees (ADMIN, RRHH)
router.post('/', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const {
    cedula, firstName, lastName, birthDate, email, phone, address,
    positionId, departmentId, laborRegimeId, workScheduleId,
    hireDate, contractType, baseSalary, bankName, accountNumber, accountType
  } = req.body;

  if (!cedula || !firstName || !lastName || !positionId || !departmentId || baseSalary === undefined || !hireDate) {
    return res.status(400).json({ error: 'Cédula, nombres, apellidos, cargo, departamento, sueldo y fecha de ingreso son requeridos' });
  }

  const salaryError = validateSalary(positionId, baseSalary, departmentId);
  if (salaryError) return res.status(400).json({ error: salaryError });
  try {
    const tx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO employees (
          cedula, first_name, last_name, birth_date, email, phone, address,
          position_id, department_id, labor_regime_id, work_schedule_id,
          hire_date, contract_type, base_salary, status,
          bank_name, account_number, account_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?, ?)
      `).run(
        cedula.trim(), firstName.trim(), lastName.trim(), birthDate || null,
        email ? email.trim() : null, phone ? phone.trim() : null, address ? address.trim() : null,
        positionId, departmentId, laborRegimeId || null, workScheduleId || null,
        hireDate, contractType || 'INDEFINIDO', Number(baseSalary),
        bankName || 'BANCO PICHINCHA', accountNumber ? accountNumber.trim() : '0000000000', accountType || 'AHORROS'
      );

      const newId = result.lastInsertRowid;
      saveBenefits(newId, req.body);

      // Register initial salary history
      db.prepare(`
        INSERT INTO salary_history (employee_id, previous_salary, new_salary, effective_date, user_id, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newId, 0, Number(baseSalary), hireDate, req.user.id, 'Contratación inicial');

      return newId;
    });

    const newId = tx();

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CREATE_EMPLOYEE',
      entity: 'EMPLOYEE',
      entityId: newId,
      newValues: { cedula, firstName, lastName, baseSalary },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Empleado registrado exitosamente', id: newId });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un empleado con esta cédula' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id (ADMIN, RRHH)
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const empId = req.params.id;
  const current = db.prepare('SELECT * FROM employees WHERE id = ?').get(empId);
  if (!current) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }

  const {
    cedula, firstName, lastName, birthDate, email, phone, address,
    positionId, departmentId, laborRegimeId, workScheduleId,
    hireDate, terminationDate, contractType, bankName, accountNumber, accountType, status
  } = req.body;

  if ((positionId && Number(positionId)!==current.position_id) || (departmentId && Number(departmentId)!==current.department_id)) {
    const error = validateSalary(positionId || current.position_id, current.base_salary, departmentId || current.department_id);
    if (error) return res.status(400).json({ error });
  }
  try {
    db.prepare(`
      UPDATE employees SET
        cedula = ?, first_name = ?, last_name = ?, birth_date = ?, email = ?, phone = ?, address = ?,
        position_id = ?, department_id = ?, labor_regime_id = ?, work_schedule_id = ?,
        hire_date = ?, termination_date = ?, contract_type = ?,
        bank_name = ?, account_number = ?, account_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      cedula || current.cedula,
      firstName || current.first_name,
      lastName || current.last_name,
      birthDate !== undefined ? birthDate : current.birth_date,
      email !== undefined ? email : current.email,
      phone !== undefined ? phone : current.phone,
      address !== undefined ? address : current.address,
      positionId || current.position_id,
      departmentId || current.department_id,
      laborRegimeId !== undefined ? laborRegimeId : current.labor_regime_id,
      workScheduleId !== undefined ? workScheduleId : current.work_schedule_id,
      hireDate || current.hire_date,
      terminationDate !== undefined ? terminationDate : current.termination_date,
      contractType || current.contract_type,
      bankName || current.bank_name,
      accountNumber || current.account_number,
      accountType || current.account_type,
      status || current.status,
      empId
    );

    saveBenefits(empId, req.body);
    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'UPDATE_EMPLOYEE',
      entity: 'EMPLOYEE',
      entityId: empId,
      oldValues: { cedula: current.cedula, status: current.status },
      newValues: { cedula, status },
      ipAddress: req.ip
    });

    res.json({ message: 'Empleado actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees/:id/salary - Change salary with history log (ADMIN only)
router.post('/:id/salary', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const empId = req.params.id;
  const { newSalary, effectiveDate, reason } = req.body;

  if (newSalary === undefined || Number(newSalary) < 0 || !effectiveDate) {
    return res.status(400).json({ error: 'Nuevo sueldo y fecha efectiva requeridos' });
  }

  const current = db.prepare('SELECT * FROM employees WHERE id = ?').get(empId);
  if (!current) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }

  const salaryError = validateSalary(current.position_id, newSalary);
  if (salaryError) return res.status(400).json({ error: salaryError });
  const prevSalary = current.base_salary;
  const updatedSalary = Number(newSalary);

  try {
    const tx = db.transaction(() => {
      db.prepare('UPDATE employees SET base_salary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(updatedSalary, empId);

      db.prepare(`
        INSERT INTO salary_history (employee_id, previous_salary, new_salary, effective_date, user_id, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(empId, prevSalary, updatedSalary, effectiveDate, req.user.id, reason || 'Ajuste salarial');
    });

    tx();

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'SALARY_CHANGE',
      entity: 'EMPLOYEE',
      entityId: empId,
      oldValues: { base_salary: prevSalary },
      newValues: { base_salary: updatedSalary, effectiveDate, reason },
      ipAddress: req.ip
    });

    res.json({
      message: 'Sueldo actualizado exitosamente',
      previousSalary: prevSalary,
      newSalary: updatedSalary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/:id/salary-history
router.get('/:id/salary-history', authenticateToken, (req, res) => {
  const history = db.prepare(`
    SELECT sh.*, u.full_name as changed_by_name
    FROM salary_history sh
    LEFT JOIN users u ON sh.user_id = u.id
    WHERE sh.employee_id = ?
    ORDER BY sh.effective_date DESC, sh.created_at DESC
  `).all(req.params.id);

  res.json(history);
});

// PUT /api/employees/:id/toggle-status - Logical deactivation/reactivation
router.put('/:id/toggle-status', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const empId = req.params.id;
  const current = db.prepare('SELECT status, first_name, last_name FROM employees WHERE id = ?').get(empId);
  if (!current) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }

  const newStatus = current.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  db.prepare('UPDATE employees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, empId);

  AuditService.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'STATUS_CHANGE',
    entity: 'EMPLOYEE',
    entityId: empId,
    oldValues: { status: current.status },
    newValues: { status: newStatus },
    ipAddress: req.ip
  });

  res.json({ message: `Empleado ${newStatus === 'ACTIVO' ? 'reactivado' : 'desactivado lógicamente'}`, status: newStatus });
});

module.exports = router;
