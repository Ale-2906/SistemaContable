const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const PayrollCalculationService = require('../services/PayrollCalculationService');

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

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, (req, res) => {
  const parameters = getActiveParameters();

  // 1. Employee counts
  const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  const activeEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'ACTIVO'").get().count;
  const inactiveEmployees = totalEmployees - activeEmployees;

  // 2. Active employees remuneration calculation
  const activeEmps = db.prepare('SELECT base_salary, position_id FROM employees WHERE status = \'ACTIVO\'').all();
  const rows = activeEmps.map(e => PayrollCalculationService.calculateRemunerationRow({
    monthlySalary: e.base_salary,
    parameters
  }));

  const totals = PayrollCalculationService.calculateTotals(rows);

  // Total décimos
  const totalDecimos = Math.round((totals.decimo13Mensual + totals.decimo14Mensual) * 100) / 100;

  // Payments summary
  const paidPayments = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE status = 'PAGADO'").get().total;
  const pendingPayments = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE status = 'PENDIENTE'").get().total;

  // Chart 1: Costo de nómina por mes (últimos períodos)
  const monthlyCostHistory = db.prepare(`
    SELECT p.id, p.name, p.payment_date, p.status,
           COALESCE(SUM(pr.total_income + pr.employer_contributions), 0) as total_cost,
           COALESCE(SUM(pr.net_salary), 0) as net_payout
    FROM pay_periods p
    LEFT JOIN payrolls pr ON p.id = pr.period_id
    GROUP BY p.id
    ORDER BY p.start_date ASC
    LIMIT 6
  `).all();

  // Chart 2: Cantidad de empleados por cargo
  const employeesByPosition = db.prepare(`
    SELECT p.name as position_name, COUNT(e.id) as count, COALESCE(SUM(e.base_salary), 0) as total_salary
    FROM positions p
    LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'ACTIVO'
    GROUP BY p.id
    ORDER BY count DESC
  `).all();

  // Chart 3: Distribución del costo laboral (Desglose exacto)
  const costDistribution = [
    { label: 'Remuneración Básica', amount: totals.monthlySalary, color: '#10b981' },
    { label: 'Aporte Patronal IESS', amount: totals.aportePatronal, color: '#3b82f6' },
    { label: 'Décimo tercero y décimo cuarto', amount: totalDecimos, color: '#f59e0b' },
    { label: 'Fondos de Reserva', amount: totals.fondosReserva, color: '#8b5cf6' }
  ];

  // Latest Period Summary
  const lastPeriod = db.prepare('SELECT * FROM pay_periods ORDER BY start_date DESC LIMIT 1').get();

  res.json({
    kpis: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      monthlySalaryMass: totals.monthlySalary,
      totalPatronal: totals.aportePatronal,
      totalPersonal: totals.aportePersonal,
      totalDecimos,
      totalFondosReserva: totals.fondosReserva,
      totalMonthlyCost: totals.costoTotalEmpresa,
      totalAnnualCost: totals.costoAnualEmpresa,
      rumConDecimos: totals.rumConDecimos,
      rumSinDecimos: totals.rumSinDecimos,
      paidPayments,
      pendingPayments
    },
    charts: {
      monthlyCostHistory,
      employeesByPosition,
      costDistribution
    },
    lastPeriod
  });
});

module.exports = router;
