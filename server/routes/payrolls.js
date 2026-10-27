const IncomeTaxService = require('../services/IncomeTaxService');
const getTaxHistory = require('../services/taxHistory');
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole, maskAccountNumber } = require('../middleware/auth');
const PayrollCalculationService = require('../services/PayrollCalculationService');
const AuditService = require('../services/auditService');

function getActiveParameters() {
  const params = db.prepare('SELECT code, value FROM payroll_parameters WHERE is_active = 1').all();
  const dict = PayrollCalculationService.getDefaultParameters();
  params.forEach(p => {
    if (p.code === 'PATRONAL_RATE') dict.patronalRate = p.value;
    if (p.code === 'PERSONAL_RATE') dict.personalRate = p.value;
    if (p.code === 'RESERVE_FUND_RATE') dict.reserveFundRate = p.value;
    if (p.code === 'DECIMO_14_BASE') dict.decimo14Base = p.value;
    if (p.code === 'MONTHLY_HOURS') dict.monthlyHours = p.value;
  });
  return dict;
}

// Read only recorded provisions up to the annual cutoff; never fabricate missing months.
function getAnnualBenefits(employee, period) {
  const result = {};
  const month = Number(period.start_date.slice(5,7));
  const year = Number(period.start_date.slice(0,4));
  for (const number of [13,14]) {
    const payoutMonth = number === 13 ? 12 : Number(employee.decimo14_month || 8);
    if (employee[`decimo${number}_mode`] === 'MENSUAL' || month !== payoutMonth) continue;
    // 13th: December-November, 14th: August-July or March-February.
    const cutoff = `${year}-${String(payoutMonth).padStart(2,'0')}-01`;
    const start = `${year-1}-${String(payoutMonth).padStart(2,'0')}-01`;
    result[number] = db.prepare(`SELECT COALESCE(SUM(i.value),0) AS amount FROM payroll_items i
      JOIN payrolls pr ON pr.id=i.payroll_id JOIN pay_periods pp ON pp.id=pr.period_id
      WHERE pr.employee_id=? AND i.code=? AND i.category='PATRONAL'
        AND pp.start_date>=? AND pp.start_date<? AND pr.status IN ('GENERADO','APROBADO','PAGADO')`).get(employee.id, `DECIMO_${number}`, start, cutoff).amount;
  }
  return result;
}
// Read-only simulation: no payroll, employee or payment is written.
router.post('/tax-preview', authenticateToken, requireRole(['ADMIN','RRHH']), (req,res)=>{
 try {
   const {employeeId,month=2,year=2026,values={},expenseEstimate} = req.body;
   if(!Number.isInteger(Number(month)) || Number(month)<1 || Number(month)>12 || Number(year)!==2026) return res.status(400).json({error:'Mes o ejercicio inválido'});
   const stored=employeeId ? db.prepare('SELECT * FROM employees WHERE id=?').get(employeeId) : null;
   if(employeeId && !stored)return res.status(404).json({error:'Colaborador no encontrado'});
   const employee={...stored};
   for(const key of ['annual_tax_rebate','annual_tax_exemption','tax_year','hire_date']) if(values[key]!==undefined)employee[key]=values[key];
   const salary=Number(stored?.base_salary ?? values.base_salary ?? 0);
   const parameters=getActiveParameters();
   const period={start_date:`${year}-${String(month).padStart(2,'0')}-01`};
   const currentIess=Math.round(salary*parameters.personalRate)/100;
   const tax=IncomeTaxService.calculate({employee,salary,earned:salary,currentIess,period,personalRate:parameters.personalRate,history:getTaxHistory(employeeId,period)});
   const estimate=expenseEstimate ? IncomeTaxService.expenseRebate({...expenseEstimate,year:Number(year)}) : null;
   res.json({tax,expenseEstimate:estimate});
 }catch(error){res.status(400).json({error:error.message});}
});
router.get('/overtime', authenticateToken, (req,res) => {
  res.json(db.prepare("SELECT type,hours FROM employee_novelties WHERE period_id=? AND employee_id=? AND type IN ('HORAS_EXTRA_50','HORAS_EXTRA_100') AND status='ACTIVO'").all(req.query.periodId,req.query.employeeId));
});
router.put('/overtime', authenticateToken, requireRole(['ADMIN','RRHH']), (req,res) => {
  const { periodId, employeeId } = req.body;
  const hours50 = Number(req.body.hours50 ?? 0), hours100 = Number(req.body.hours100 ?? 0);
  const period = db.prepare('SELECT * FROM pay_periods WHERE id=?').get(periodId);
  if (!period || !db.prepare('SELECT id FROM employees WHERE id=?').get(employeeId)) return res.status(400).json({ error: 'Empleado o período inválido' });
  if (!['BORRADOR','ABIERTO','CALCULADO'].includes(period.status)) return res.status(409).json({ error: 'El período está cerrado o pagado' });
  if (![hours50,hours100].every(h => Number.isFinite(h) && h >= 0 && h <= 240)) return res.status(400).json({ error: 'Las horas deben estar entre 0 y 240' });
  db.transaction(() => {
    db.prepare("DELETE FROM employee_novelties WHERE period_id=? AND employee_id=? AND type IN ('HORAS_EXTRA_50','HORAS_EXTRA_100')").run(periodId,employeeId);
    db.prepare("UPDATE payrolls SET status='DESACTUALIZADO' WHERE period_id=? AND employee_id=? AND status IN ('GENERADO','DESACTUALIZADO')").run(periodId,employeeId);
    for (const [type,hours] of [['HORAS_EXTRA_50',hours50],['HORAS_EXTRA_100',hours100]]) {
      if (hours > 0) db.prepare("INSERT INTO employee_novelties (employee_id,period_id,category,type,hours,value,date,user_id) VALUES (?,?,'INGRESO',?,?,0,?,?)").run(employeeId,periodId,type,hours,period.end_date,req.user.id);
    }
  })();
  AuditService.log({ userId: req.user.id, userEmail: req.user.email, action: 'SAVE_OVERTIME', entity: 'EMPLOYEE', entityId: employeeId, newValues: { periodId,hours50,hours100 }, ipAddress: req.ip });
  res.json({ message: 'Horas guardadas. Genere o recalcule la nómina para aplicarlas.' });
});

// POST /api/payrolls/generate - Generate payrolls for all active employees for a period
router.post('/generate', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { periodId } = req.body;
  if (!periodId) {
    return res.status(400).json({ error: 'El ID del período es obligatorio' });
  }

  const period = db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(periodId);
  if (!period) {
    return res.status(404).json({ error: 'Período no encontrado' });
  }

  if (!['ABIERTO', 'BORRADOR', 'CALCULADO'].includes(period.status)) {
    return res.status(409).json({ error: 'La nomina ya esta cerrada o pagada y no puede recalcularse' });
  }

  const parameters = getActiveParameters();
  const activeEmployees = db.prepare(`
    SELECT e.*, d.name as department_name, p.name as position_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    JOIN positions p ON e.position_id = p.id
    WHERE e.status = 'ACTIVO'
  `).all();

  if (activeEmployees.length === 0) {
    return res.status(400).json({ error: 'No hay empleados activos para generar nómina' });
  }

  const tx = db.transaction(() => {
    let count = 0;
    let sumBase = 0, sumPersonal = 0, sumPatronal = 0, sumNet = 0, sumBenefits = 0, sumCompany = 0;

    for (const emp of activeEmployees) {
      const novelties = db.prepare(`
        SELECT * FROM employee_novelties
        WHERE employee_id = ? AND period_id = ? AND status = 'ACTIVO'
      `).all(emp.id, period.id);

      const calc = PayrollCalculationService.calculateMonthlyPayroll({
        employee: emp,
        baseSalary: emp.base_salary,
        period,
        novelties,
        parameters,
        annualBenefits: getAnnualBenefits(emp, period),
        taxHistory: getTaxHistory(emp.id, period)
      });

      sumBase += calc.baseSalary;
      sumPersonal += calc.items.find(item => item.code === 'IESS_PERSONAL').value;
      const patronal = calc.items.find(item => item.code === 'IESS_PATRONAL').value;
      sumPatronal += patronal;
      sumNet += calc.netSalary;
      sumBenefits += calc.employerContributions - patronal;
      sumCompany += calc.companyTotalCost;

      const existing = db.prepare('SELECT id FROM payrolls WHERE period_id = ? AND employee_id = ?').get(period.id, emp.id);
      let prId;

      if (existing) {
        db.prepare(`
          UPDATE payrolls SET
            base_salary_snapshot = ?,
            total_income = ?,
            total_deductions = ?,
            employer_contributions = ?,
            net_salary = ?,
            status = 'GENERADO',
            calculation_snapshot_json = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          calc.baseSalary, calc.totalIncome, calc.totalDeductions,
          calc.employerContributions, calc.netSalary, calc.snapshotJson, existing.id
        );
        prId = existing.id;
        db.prepare('DELETE FROM payroll_items WHERE payroll_id = ?').run(prId);
      } else {
        const ins = db.prepare(`
          INSERT INTO payrolls (
            period_id, employee_id, base_salary_snapshot, total_income, total_deductions,
            employer_contributions, net_salary, status, calculation_snapshot_json, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'GENERADO', ?, ?)
        `).run(
          period.id, emp.id, calc.baseSalary, calc.totalIncome, calc.totalDeductions,
          calc.employerContributions, calc.netSalary, calc.snapshotJson, req.user.id
        );
        prId = ins.lastInsertRowid;
      }

      const insertItem = db.prepare(`
        INSERT INTO payroll_items (payroll_id, category, code, name, value, is_taxable, is_iess, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      calc.items.forEach(it => {
        insertItem.run(prId, it.category, it.code, it.name, it.value, it.is_taxable || 0, it.is_iess || 0, it.notes || null);
      });

      count++;
    }

    // Update period status to CALCULADO if it was ABIERTO
    if (['ABIERTO', 'BORRADOR'].includes(period.status)) {
      db.prepare("UPDATE pay_periods SET status = 'CALCULADO', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(period.id);
    }

    return {
      count,
      summary: {
        totalEmployees: count,
        totalRemunerations: Math.round(sumBase * 100) / 100,
        totalAportesPersonales: Math.round(sumPersonal * 100) / 100,
        totalAportesPatronales: Math.round(sumPatronal * 100) / 100,
        totalBeneficios: Math.round(sumBenefits * 100) / 100,
        totalNetoAPagar: Math.round(sumNet * 100) / 100,
        totalCostoEmpresarial: Math.round(sumCompany * 100) / 100
      }
    };
  });

  try {
    const resSummary = tx();

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'GENERATE_PAYROLL',
      entity: 'PAYROLL',
      entityId: periodId,
      newValues: resSummary.summary,
      ipAddress: req.ip
    });

    res.json({
      message: `Nómina generada exitosamente para ${resSummary.count} colaboradores.`,
      ...resSummary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payrolls - List payrolls for a period
router.get('/', authenticateToken, (req, res) => {
  const { periodId, departmentId, search } = req.query;

  if (!periodId) {
    return res.status(400).json({ error: 'El parámetro periodId es obligatorio' });
  }

  let query = `
    SELECT pr.*,
           e.cedula as employee_cedula,
           e.first_name || ' ' || e.last_name as employee_name,
           e.email as employee_email,
           e.bank_name,
           e.account_number,
           e.account_type,
           d.name as department_name,
           p.name as position_name,
           lr.name as labor_regime_name,
           ws.name as work_schedule_name
    FROM payrolls pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    JOIN positions p ON e.position_id = p.id
    LEFT JOIN labor_regimes lr ON e.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    WHERE pr.period_id = ?
  `;
  const params = [periodId];

  if (departmentId) {
    query += ` AND d.id = ?`;
    params.push(departmentId);
  }

  if (search) {
    query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.cedula LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY e.id ASC`;

  const rows = db.prepare(query).all(...params);
  const period = db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(periodId);
  if (!period) return res.status(404).json({ error: 'Periodo no encontrado' });
  const storedIds = new Set(db.prepare('SELECT employee_id FROM payrolls WHERE period_id = ?').all(periodId).map(row => row.employee_id));
  const parameters = getActiveParameters();
  let missingQuery = `SELECT e.*, p.name AS position_name, d.name AS department_name
    FROM employees e JOIN positions p ON p.id=e.position_id JOIN departments d ON d.id=e.department_id
    WHERE e.status='ACTIVO'`;
  const missingParams = [];
  if (departmentId) { missingQuery += ' AND e.department_id = ?'; missingParams.push(departmentId); }
  if (search) { missingQuery += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.cedula LIKE ?)'; missingParams.push(...Array(3).fill(`%${search}%`)); }
  for (const employee of db.prepare(missingQuery).all(...missingParams)) {
    if (storedIds.has(employee.id)) continue;
    const novelties = db.prepare("SELECT * FROM employee_novelties WHERE employee_id=? AND period_id=? AND status='ACTIVO'").all(employee.id, period.id);
    const calc = PayrollCalculationService.calculateMonthlyPayroll({ employee, baseSalary: employee.base_salary, period, parameters, novelties, annualBenefits: getAnnualBenefits(employee, period), taxHistory: getTaxHistory(employee.id, period) });
    rows.push({ id: `preview-${employee.id}`, employee_id: employee.id, employee_name: `${employee.first_name} ${employee.last_name}`,
      position_name: employee.position_name, department_name: employee.department_name,
      base_salary_snapshot: calc.baseSalary, total_income: calc.totalIncome, total_deductions: calc.totalDeductions,
      employer_contributions: calc.employerContributions, net_salary: calc.netSalary,
      status: 'PREVISION', is_projection: true, calculation_snapshot_json: calc.snapshotJson });
  }


  const totals = rows.reduce(
    (acc, row) => {
      acc.totalBaseSalary += Number(row.base_salary_snapshot);
      acc.totalIncome += Number(row.total_income);
      acc.totalDeductions += Number(row.total_deductions);
      acc.totalNetPayout += Number(row.net_salary);
      acc.totalEmployerCost += Number(row.employer_contributions);
      acc.totalCompanyDisbursement += Number(row.total_income) + Number(row.employer_contributions);
      return acc;
    },
    {
      totalBaseSalary: 0,
      totalIncome: 0,
      totalDeductions: 0,
      totalNetPayout: 0,
      totalEmployerCost: 0,
      totalCompanyDisbursement: 0
    }
  );

  res.json({
    periodId: Number(periodId),
    projectionCount: rows.filter(row => row.is_projection).length,
    generatedCount: rows.filter(row => !row.is_projection).length,
    items: rows.map(r => {
      const items = JSON.parse(r.calculation_snapshot_json || '{}').items || [];
      const sum = filter => Math.round(items.filter(filter).reduce((s,i)=>s+Number(i.value),0)*100)/100;
      return { ...r, overtime_amount: sum(i=>['HORAS_EXTRA_50','HORAS_EXTRA_100'].includes(i.code)),
        income_tax: sum(i=>i.code==='IMPUESTO_RENTA'), decimos_paid: sum(i=>i.category==='INGRESO' && /DECIMO_/.test(i.code)), account_number_masked: maskAccountNumber(r.account_number) };
    }),
    totals: {
      totalBaseSalary: Math.round(totals.totalBaseSalary * 100) / 100,
      totalIncome: Math.round(totals.totalIncome * 100) / 100,
      totalDeductions: Math.round(totals.totalDeductions * 100) / 100,
      totalNetPayout: Math.round(totals.totalNetPayout * 100) / 100,
      totalEmployerCost: Math.round(totals.totalEmployerCost * 100) / 100,
      totalCompanyDisbursement: Math.round(totals.totalCompanyDisbursement * 100) / 100,
      employeeCount: rows.length
    }
  });
});

// GET /api/payrolls/:id - Get individual employee payroll slip (Rol de Pago)
router.get('/:id', authenticateToken, (req, res) => {
  const payroll = db.prepare(`
    SELECT pr.*,
           e.cedula as employee_cedula,
           e.first_name,
           e.last_name,
           e.first_name || ' ' || e.last_name as employee_name,
           e.email as employee_email,
           e.phone as employee_phone,
           e.address as employee_address,
           e.hire_date,
           e.bank_name,
           e.account_number,
           e.account_type,
           d.name as department_name,
           pos.name as position_name,
           lr.name as labor_regime_name,
           ws.name as work_schedule_name,
           p.name as period_name,
           p.start_date as period_start_date,
           p.end_date as period_end_date,
           p.payment_date as period_payment_date,
           u_app.full_name as approved_by_name
    FROM payrolls pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    JOIN positions pos ON e.position_id = pos.id
    LEFT JOIN labor_regimes lr ON e.labor_regime_id = lr.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    JOIN pay_periods p ON pr.period_id = p.id
    LEFT JOIN users u_app ON pr.approved_by = u_app.id
    WHERE pr.id = ?
  `).get(req.params.id);

  if (!payroll) {
    return res.status(404).json({ error: 'Rol de pago no encontrado' });
  }

  const items = db.prepare(`
    SELECT * FROM payroll_items
    WHERE payroll_id = ?
    ORDER BY category DESC, id ASC
  `).all(payroll.id);

  const earnings = items.filter(it => it.category === 'INGRESO');
  const deductions = items.filter(it => it.category === 'DESCUENTO');
  const employerItems = items.filter(it => it.category === 'PATRONAL');
  const company = db.prepare('SELECT * FROM company_settings ORDER BY id ASC LIMIT 1').get() || {};

  res.json({
    payroll: {
      ...payroll,
      account_number_masked: maskAccountNumber(payroll.account_number)
    },
    earnings,
    deductions,
    employerItems,
    company
  });
});

// POST /api/payrolls/approve - Approve payroll for period & lock snapshots
router.post('/approve', authenticateToken, requireRole(['ADMIN', 'RRHH']), (req, res) => {
  const { periodId } = req.body;
  if (!periodId) {
    return res.status(400).json({ error: 'ID de período requerido' });
  }

  const period = db.prepare('SELECT * FROM pay_periods WHERE id = ?').get(periodId);
  if (!period) {
    return res.status(404).json({ error: 'Período no encontrado' });
  }

  if (['CERRADO', 'PAGADO'].includes(period.status)) {
    return res.status(409).json({ error: 'La nomina ya fue aprobada o pagada' });
  }

  const payrolls = db.prepare('SELECT * FROM payrolls WHERE period_id = ?').all(periodId);
  if (payrolls.length === 0) {
    return res.status(400).json({ error: 'No hay roles calculados en este período para aprobar' });
  }

  if (payrolls.some(p => p.status !== 'GENERADO')) {
    return res.status(409).json({ error: 'Solo se pueden aprobar roles en estado GENERADO' });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE payrolls SET status = 'APROBADO', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE period_id = ?
    `).run(req.user.id, periodId);

    db.prepare("UPDATE pay_periods SET status = 'CERRADO', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(periodId);

    // Auto-create payment batch
    const totalAmount = Math.round(payrolls.reduce((sum, p) => sum + Number(p.net_salary), 0) * 100) / 100;
    const existingPayment = db.prepare('SELECT id FROM payments WHERE period_id = ?').get(periodId);
    let payId;

    if (!existingPayment) {
      const ins = db.prepare(`
        INSERT INTO payments (period_id, code, payment_date, total_amount, total_employees, status, created_by)
        VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?)
      `).run(periodId, `PAY-${period.name.replace(/\s+/g, '-').toUpperCase()}`, period.payment_date, totalAmount, payrolls.length, req.user.id);
      payId = ins.lastInsertRowid;
    } else {
      payId = existingPayment.id;
      db.prepare('UPDATE payments SET total_amount = ?, total_employees = ? WHERE id = ?').run(totalAmount, payrolls.length, payId);
      db.prepare('DELETE FROM payment_items WHERE payment_id = ?').run(payId);
    }

    const insertPayItem = db.prepare(`
      INSERT INTO payment_items (payment_id, payroll_id, employee_id, bank_name, account_type, account_number_masked, amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')
    `);

    for (const pr of payrolls) {
      const emp = db.prepare('SELECT bank_name, account_type, account_number FROM employees WHERE id = ?').get(pr.employee_id);
      insertPayItem.run(payId, pr.id, pr.employee_id, emp.bank_name, emp.account_type, maskAccountNumber(emp.account_number), pr.net_salary);
    }
  });

  try {
    tx();

    AuditService.log({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'APPROVE_PAYROLL',
      entity: 'PAYROLL',
      entityId: periodId,
      newValues: { status: 'APROBADO' },
      ipAddress: req.ip
    });

    res.json({ message: 'Nómina aprobada y congelada con éxito. Lista de pagos generada en el módulo Pagos.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
