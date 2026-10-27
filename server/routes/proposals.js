const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const PayrollCalculationService = require('../services/PayrollCalculationService');
const AuditService = require('../services/auditService');

// GET /api/proposals - Get all proposals with comparative totals
router.get('/', authenticateToken, (req, res) => {
  const proposals = db.prepare('SELECT * FROM proposals ORDER BY id ASC').all();
  const params = PayrollCalculationService.getDefaultParameters();

  const results = proposals.map(prop => {
    const items = db.prepare('SELECT * FROM proposal_items WHERE proposal_id = ?').all(prop.id);

    let totalEmployees = 0;
    let totalSalaries = 0;
    let totalPatronal = 0;
    let totalPersonal = 0;
    let totalBenefits = 0;
    let totalMonthlyCost = 0;
    let totalRumConDecimos = 0;

    const detailedItems = items.map(it => {
      const count = Number(it.employee_count || 1);
      const calc = PayrollCalculationService.calculateRemunerationRow({
        monthlySalary: it.monthly_salary,
        parameters: params
      });

      const benefitsPerEmp = calc.decimo13Mensual + calc.decimo14Mensual + calc.fondosReserva;

      totalEmployees += count;
      totalSalaries += (calc.monthlySalary * count);
      totalPatronal += (calc.aportePatronal * count);
      totalPersonal += (calc.aportePersonal * count);
      totalBenefits += (benefitsPerEmp * count);
      totalMonthlyCost += (calc.costoTotalEmpresa * count);
      totalRumConDecimos += (calc.rumConDecimos * count);

      return {
        ...it,
        calculated: calc
      };
    });

    return {
      id: prop.id,
      name: prop.name,
      description: prop.description,
      employeeCount: totalEmployees,
      totalSalaries: Math.round(totalSalaries * 100) / 100,
      totalPatronal: Math.round(totalPatronal * 100) / 100,
      totalPersonal: Math.round(totalPersonal * 100) / 100,
      totalBenefits: Math.round(totalBenefits * 100) / 100,
      totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      totalAnnualCost: Math.round(totalMonthlyCost * 12 * 100) / 100,
      totalRumConDecimos: Math.round(totalRumConDecimos * 100) / 100,
      items: detailedItems
    };
  });

  res.json(results);
});

// POST /api/proposals - Create scenario
router.post('/', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nombre de propuesta requerido' });
  }

  const result = db.prepare('INSERT INTO proposals (name, description, created_by) VALUES (?, ?, ?)')
    .run(name.trim(), description || '', req.user.id);

  AuditService.log({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'CREATE_PROPOSAL',
    entity: 'PROPOSAL',
    entityId: result.lastInsertRowid,
    newValues: { name },
    ipAddress: req.ip
  });

  res.status(201).json({ message: 'Propuesta creada', id: result.lastInsertRowid });
});

// POST /api/proposals/:id/items - Add position to scenario
router.post('/:id/items', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { positionName, laborRegime, workSchedule, monthlySalary, employeeCount = 1 } = req.body;

  if (!positionName || !monthlySalary) {
    return res.status(400).json({ error: 'Nombre del cargo y salario requeridos' });
  }

  db.prepare(`
    INSERT INTO proposal_items (proposal_id, position_name, labor_regime, work_schedule, monthly_salary, employee_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    positionName.trim(),
    laborRegime || 'CÓDIGO DE TRABAJO',
    workSchedule || '08H00 A 17H00',
    Number(monthlySalary),
    Number(employeeCount)
  );

  res.status(201).json({ message: 'Cargo agregado a la propuesta' });
});

module.exports = router;
