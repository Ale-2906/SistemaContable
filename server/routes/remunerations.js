const validateSalary = require('../services/salaryScale');
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const XLSX = require('xlsx');
const { authenticateToken, requireRole } = require('../middleware/auth');
const PayrollCalculationService = require('../services/PayrollCalculationService');
const AuditService = require('../services/auditService');

// Helper to get active parameters dictionary
function getActiveParameters() {
  const params = db.prepare('SELECT code, value FROM payroll_parameters WHERE is_active = 1').all();
  const dict = PayrollCalculationService.getDefaultParameters();

  params.forEach(p => {
    if (p.code === 'PATRONAL_RATE') dict.patronalRate = p.value;
    if (p.code === 'PERSONAL_RATE') dict.personalRate = p.value;
    if (p.code === 'RESERVE_FUND_RATE') dict.reserveFundRate = p.value;
    if (p.code === 'DECIMO_14_BASE') dict.decimo14Base = p.value;
  });

  return dict;
}

// GET /api/remunerations - Get complete Cuadro de Remuneraciones with calculated columns & Totals
router.get('/', authenticateToken, (req, res) => {
  const { search, regimeId, positionId } = req.query;
  const parameters = getActiveParameters();

  let query = `
    SELECT e.id, e.cedula, e.first_name, e.last_name, e.base_salary, e.status,
           p.name as position_name,
           d.name as department_name,
           COALESCE(lr.name, 'CÓDIGO DE TRABAJO') as labor_regime,
           COALESCE(ws.name, '08H00 A 17H00') as work_schedule
    FROM employees e
    JOIN positions p ON e.position_id = p.id
    JOIN departments d ON e.department_id = d.id
    LEFT JOIN labor_regimes lr ON e.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    WHERE e.status = 'ACTIVO'
  `;
  const params = [];

  if (regimeId) {
    query += ` AND e.labor_regime_id = ?`;
    params.push(regimeId);
  }

  if (positionId) {
    query += ` AND e.position_id = ?`;
    params.push(positionId);
  }

  if (search) {
    query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.cedula LIKE ? OR p.name LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += ` ORDER BY e.id ASC`;

  const rows = db.prepare(query).all(...params);

  // Map each employee into the exact Remuneration Structure
  let itemCounter = 1;
  const calculatedRows = rows.map(emp => {
    const calc = PayrollCalculationService.calculateRemunerationRow({
      monthlySalary: emp.base_salary,
      parameters
    });

    return {
      no: itemCounter++,
      employeeId: emp.id,
      cedula: emp.cedula,
      employeeName: `${emp.first_name} ${emp.last_name}`,
      denominacion: emp.position_name,
      regimenLaboral: emp.labor_regime,
      jornadaTrabajo: emp.work_schedule,
      departmentName: emp.department_name,
      ...calc
    };
  });

  const totals = PayrollCalculationService.calculateTotals(calculatedRows);

  res.json({
    rows: calculatedRows,
    totals,
    parametersUsed: parameters
  });
});

// POST /api/remunerations/simulate - Real-time calculation on the fly
router.post('/simulate', authenticateToken, (req, res) => {
  const { monthlySalary } = req.body;
  const parameters = getActiveParameters();

  const calc = PayrollCalculationService.calculateRemunerationRow({
    monthlySalary: Number(monthlySalary || 0),
    parameters
  });

  res.json(calc);
});

// PUT /api/remunerations/employee/:id/salary - Inline salary change
router.put('/employee/:id/salary', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const empId = req.params.id;
  const { newSalary, reason } = req.body;

  if (newSalary === undefined || Number(newSalary) < 0) {
    return res.status(400).json({ error: 'Sueldo inválido' });
  }

  const current = db.prepare('SELECT id, position_id, base_salary, first_name, last_name FROM employees WHERE id = ?').get(empId);
  if (!current) {
    return res.status(404).json({ error: 'Empleado no encontrado' });
  }

  const salaryError = validateSalary(current.position_id, newSalary);
  if (salaryError) return res.status(400).json({ error: salaryError });
  const prev = current.base_salary;
  const nextVal = Number(newSalary);

  try {
    const tx = db.transaction(() => {
      db.prepare('UPDATE employees SET base_salary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(nextVal, empId);

      db.prepare(`
        INSERT INTO salary_history (employee_id, previous_salary, new_salary, effective_date, user_id, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(empId, prev, nextVal, new Date().toISOString().split('T')[0], req.user.id, reason || 'Ajuste en cuadro de remuneraciones');
    });

    tx();

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'SALARY_CHANGE_INLINE',
      entity: 'EMPLOYEE',
      entityId: empId,
      oldValues: { base_salary: prev },
      newValues: { base_salary: nextVal, reason },
      ipAddress: req.ip
    });

    res.json({ message: 'Remuneración actualizada exitosamente', newSalary: nextVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/remunerations/export/excel - Export real XLSX file
router.get('/export/excel', authenticateToken, (req, res) => {
  const parameters = getActiveParameters();
  const rows = db.prepare(`
    SELECT e.id, e.cedula, e.first_name, e.last_name, e.base_salary,
           p.name as position_name,
           COALESCE(lr.name, 'CÓDIGO DE TRABAJO') as labor_regime,
           COALESCE(ws.name, '08H00 A 17H00') as work_schedule
    FROM employees e
    JOIN positions p ON e.position_id = p.id
    LEFT JOIN labor_regimes lr ON e.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    WHERE e.status = 'ACTIVO'
    ORDER BY e.id ASC
  `).all();

  let counter = 1;
  const sheetData = [
    ['MYSUBS - CUADRO DE REMUNERACIONES OFICIAL'],
    [`Generado: ${new Date().toLocaleDateString('es-EC')} | Moneda: USD`],
    [],
    [
      'No.', 'DENOMINACIÓN', 'RÉGIMEN LABORAL', 'JORNADA DE TRABAJO',
      'REMUNERACIÓN MENSUAL', 'APORTE PATRONAL', 'APORTE PERSONAL',
      'DÉCIMO CUARTO', 'DÉCIMO CUARTO MENSUAL', 'DÉCIMO TERCERO', 'DÉCIMO TERCERO MENSUAL',
      'FONDOS DE RESERVA', 'RUM MENSUAL CON DÉCIMOS', 'RUM MENSUAL SIN DÉCIMOS', 'COSTO TOTAL EMPRESA'
    ]
  ];

  let sumSalary = 0, sumPatronal = 0, sumPersonal = 0, sumD14 = 0, sumD14M = 0;
  let sumD13 = 0, sumD13M = 0, sumFondos = 0, sumRumCon = 0, sumRumSin = 0, sumCosto = 0;

  rows.forEach(r => {
    const calc = PayrollCalculationService.calculateRemunerationRow({
      monthlySalary: r.base_salary,
      parameters
    });

    sumSalary += calc.monthlySalary;
    sumPatronal += calc.aportePatronal;
    sumPersonal += calc.aportePersonal;
    sumD14 += calc.decimo14Anual;
    sumD14M += calc.decimo14Mensual;
    sumD13 += calc.decimo13Anual;
    sumD13M += calc.decimo13Mensual;
    sumFondos += calc.fondosReserva;
    sumRumCon += calc.rumConDecimos;
    sumRumSin += calc.rumSinDecimos;
    sumCosto += calc.costoTotalEmpresa;

    sheetData.push([
      counter++,
      r.position_name,
      r.labor_regime,
      r.work_schedule,
      calc.monthlySalary,
      calc.aportePatronal,
      calc.aportePersonal,
      calc.decimo14Anual,
      calc.decimo14Mensual,
      calc.decimo13Anual,
      calc.decimo13Mensual,
      calc.fondosReserva,
      calc.rumConDecimos,
      calc.rumSinDecimos,
      calc.costoTotalEmpresa
    ]);
  });

  // SUM Row
  sheetData.push([
    'TOTAL',
    '',
    '',
    '',
    sumSalary,
    sumPatronal,
    sumPersonal,
    sumD14,
    sumD14M,
    sumD13,
    sumD13M,
    sumFondos,
    sumRumCon,
    sumRumSin,
    sumCosto
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Cuadro Remuneraciones MYSUBS');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  AuditService.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'EXPORT_EXCEL',
    entity: 'REMUNERATIONS',
    ipAddress: req.ip
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=MYSUBS_Cuadro_Remuneraciones.xlsx');
  res.send(buf);
});

module.exports = router;
