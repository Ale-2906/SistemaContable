const express = require('express');
const router = express.Router();
const db = require('../config/database');
const XLSX = require('xlsx');
const { authenticateToken, maskAccountNumber } = require('../middleware/auth');
const PayrollCalculationService = require('../services/PayrollCalculationService');
const AuditService = require('../services/auditService');

function csvEscape(val) {
  if (val === null || val === undefined) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
}

// GET /api/reports/employees.csv
router.get('/employees.csv', authenticateToken, (req, res) => {
  const employees = db.prepare(`
    SELECT e.*, d.name as department_name, p.name as position_name,
           COALESCE(lr.name, 'CÓDIGO DE TRABAJO') as labor_regime,
           COALESCE(ws.name, '08H00 A 17H00') as work_schedule
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN positions p ON e.position_id = p.id
    LEFT JOIN labor_regimes lr ON e.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    ORDER BY e.id ASC
  `).all();

  let csv = '\uFEFF';
  csv += 'ID,CEDULA,APELLIDOS,NOMBRES,CARGO,DEPARTAMENTO,REGIMEN,JORNADA,REMUNERACION,ESTADO,FECHA_INGRESO\n';

  for (const e of employees) {
    csv += [
      e.id,
      csvEscape(e.cedula),
      csvEscape(e.last_name),
      csvEscape(e.first_name),
      csvEscape(e.position_name),
      csvEscape(e.department_name),
      csvEscape(e.labor_regime),
      csvEscape(e.work_schedule),
      e.base_salary.toFixed(2),
      e.status,
      e.hire_date
    ].join(',') + '\n';
  }

  AuditService.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'EXPORT',
    entity: 'EMPLOYEES_REPORT',
    ipAddress: req.ip
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=MYSUBS_Reporte_Empleados.csv');
  res.send(csv);
});

// GET /api/reports/payroll/:periodId.csv
router.get('/payroll/:periodId.csv', authenticateToken, (req, res) => {
  const period = db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(req.params.periodId);
  if (!period) return res.status(404).json({ error: 'Período no encontrado' });

  const payrolls = db.prepare(`
    SELECT pr.*, e.cedula, e.first_name || ' ' || e.last_name as employee_name,
           d.name as department_name, p.name as position_name
    FROM payrolls pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    JOIN positions p ON e.position_id = p.id
    WHERE pr.period_id = ?
    ORDER BY e.id ASC
  `).all(period.id);

  let csv = '\uFEFF';
  csv += `MYSUBS - REPORTE DE NÓMINA (${period.name})\n`;
  csv += `Período: ${period.start_date} al ${period.end_date}\n\n`;
  csv += 'CEDULA,EMPLEADO,CARGO,DEPARTAMENTO,SUELDO_BASE,INGRESOS,DESCUENTOS,NETO_A_PAGAR,APORTE_PATRONAL,ESTADO\n';

  let sumBase = 0, sumInc = 0, sumDed = 0, sumNet = 0, sumPatronal = 0;

  for (const r of payrolls) {
    sumBase += r.base_salary_snapshot;
    sumInc += r.total_income;
    sumDed += r.total_deductions;
    sumNet += r.net_salary;
    sumPatronal += r.employer_contributions;

    csv += [
      csvEscape(r.cedula),
      csvEscape(r.employee_name),
      csvEscape(r.position_name),
      csvEscape(r.department_name),
      r.base_salary_snapshot.toFixed(2),
      r.total_income.toFixed(2),
      r.total_deductions.toFixed(2),
      r.net_salary.toFixed(2),
      r.employer_contributions.toFixed(2),
      r.status
    ].join(',') + '\n';
  }

  csv += '\n';
  csv += `TOTALES:,"","","",${sumBase.toFixed(2)},${sumInc.toFixed(2)},${sumDed.toFixed(2)},${sumNet.toFixed(2)},${sumPatronal.toFixed(2)},""\n`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=MYSUBS_Nomina_${period.name.replace(/\s+/g, '_')}.csv`);
  res.send(csv);
});

module.exports = router;
