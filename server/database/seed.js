const bcrypt = require('bcryptjs');
const db = require('../config/database');
const initializeDatabase = require('./init');
const PayrollCalculationService = require('../services/PayrollCalculationService');
const AuditService = require('../services/auditService');

function seedDatabase(force = false) {
  console.log('--- Initializing database schema ---');
  initializeDatabase();

  if (force) {
    console.log('Force reseed requested. Clearing tables...');
    db.exec(`
      DELETE FROM payment_items;
      DELETE FROM payments;
      DELETE FROM payroll_items;
      DELETE FROM payrolls;
      DELETE FROM employee_novelties;
      DELETE FROM salary_history;
      DELETE FROM proposal_items;
      DELETE FROM proposals;
      DELETE FROM employees;
      DELETE FROM positions;
      DELETE FROM work_schedules;
      DELETE FROM labor_regimes;
      DELETE FROM departments;
      DELETE FROM payroll_parameters;
      DELETE FROM parameter_history;
      DELETE FROM company_settings;
      DELETE FROM users;
      DELETE FROM roles;
    `);
  }

  // Check if users already exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (existingUsers > 0 && !force) {
    console.log('Database already contains data. Skipping initial seeding.');
    return;
  }

  console.log('--- Seeding roles ---');
  const roles = [
    { name: 'ADMIN', description: 'Administrador con acceso total al sistema y parámetros' },
    { name: 'RRHH', description: 'Recursos Humanos / Contabilidad: Gestión de personal y roles' },
    { name: 'CONSULTA', description: 'Consulta: Acceso de sólo lectura' }
  ];
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)');
  roles.forEach(r => insertRole.run(r.name, r.description));

  const roleMap = {};
  db.prepare('SELECT id, name FROM roles').all().forEach(r => { roleMap[r.name] = r.id; });

  console.log('--- Seeding users ---');
  const adminPass = bcrypt.hashSync('admin123', 10);
  const rrhhPass = bcrypt.hashSync('rrhh123', 10);
  const consultaPass = bcrypt.hashSync('consulta123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role_id, full_name, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  insertUser.run('admin', 'admin@mysubs.com', adminPass, roleMap['ADMIN'], 'Thomas Administrador General');
  insertUser.run('rrhh', 'rrhh@mysubs.com', rrhhPass, roleMap['RRHH'], 'Lic. Paulina Carrera (RRHH & Contabilidad)');
  insertUser.run('contabilidad', 'contabilidad@mysubs.com', rrhhPass, roleMap['RRHH'], 'Ing. Fernando Mora (Contador)');
  insertUser.run('consulta', 'consulta@mysubs.com', consultaPass, roleMap['CONSULTA'], 'Auditor de Consulta');

  console.log('--- Seeding company settings ---');
  db.prepare(`
    INSERT INTO company_settings (
      id, company_name, ruc, address, phone, email, currency_symbol, receipt_footer_text
    ) VALUES (
      1, 'MySubsSmart', '1792837465001',
      'Av. República de El Salvador N34-183 y Moscú, Quito - Ecuador',
      '+593 2 290 4839', 'nomina@mysubs.ec', '$',
      'Documento de rol de pago oficial generado electrónicamente por Sistema MYSUBS Nómina. Válido para constancia laboral e IESS.'
    )
  `).run();

  console.log('--- Seeding configurable payroll parameters ---');
  const insertParam = db.prepare(`
    INSERT INTO payroll_parameters (code, name, value, unit, effective_start_date, is_active, description)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  insertParam.run('PATRONAL_RATE', 'Porcentaje de Aporte Patronal', 12.15, '%', '2026-01-01', 'Porcentaje legal de aporte patronal asumido por la empresa');
  insertParam.run('PERSONAL_RATE', 'Porcentaje de Aporte Personal', 9.45, '%', '2026-01-01', 'Porcentaje legal descontado al empleado para el IESS');
  insertParam.run('RESERVE_FUND_RATE', 'Porcentaje Fondos de Reserva', 8.33, '%', '2026-01-01', 'Porcentaje legal correspondiente a fondos de reserva');
  insertParam.run('DECIMO_14_BASE', 'Base Anual Décimo Cuarto (SBU)', 460.00, '$', '2026-01-01', 'Salario Básico Unificado de referencia para el cálculo de la décimo cuarto');
  insertParam.run('MONTHLY_HOURS', 'Horas Base Mensuales', 240, 'h', '2026-01-01', 'Horas estándar mensuales para cálculo de valor hora');

  console.log('--- Seeding labor regimes ---');
  const insertRegime = db.prepare('INSERT INTO labor_regimes (code, name, description) VALUES (?, ?, ?)');
  const r1 = insertRegime.run('CODIGO_TRABAJO', 'CÓDIGO DE TRABAJO', 'Régimen laboral privado general de Ecuador').lastInsertRowid;
  const r2 = insertRegime.run('LOEP', 'LOEP', 'Ley Orgánica de Empresas Públicas').lastInsertRowid;
  const r3 = insertRegime.run('OTRO', 'OTRO RÉGIMEN', 'Régimen especial o pasantías').lastInsertRowid;

  console.log('--- Seeding work schedules ---');
  const insertSchedule = db.prepare(`
    INSERT INTO work_schedules (name, start_time, end_time, daily_hours, schedule_type, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const sAdmin = insertSchedule.run('08H00 A 17H00', '08:00', '17:00', 8.0, 'DIURNA', 'Horario administrativo estándar con 1h almuerzo').lastInsertRowid;
  const sT1 = insertSchedule.run('06:00 - 14:00', '06:00', '14:00', 8.0, 'MATUTINA', 'Turno operario 1 (Apertura y ensamble)').lastInsertRowid;
  const sT2 = insertSchedule.run('14:00 - 22:00', '14:00', '22:00', 8.0, 'VESPERTINA', 'Turno operario 2 (Tarde y servicio)').lastInsertRowid;
  const sT3 = insertSchedule.run('22:00 - 06:00', '22:00', '06:00', 8.0, 'NOCTURNA', 'Turno operario 3 (Cierre, inventario y noche)').lastInsertRowid;

  console.log('--- Seeding departments ---');
  const insertDept = db.prepare('INSERT INTO departments (name, code, description) VALUES (?, ?, ?)');
  const dAdmin = insertDept.run('Administración y Finanzas', 'ADMIN', 'Dirección general y finanzas').lastInsertRowid;
  const dOper = insertDept.run('Operaciones e Instalaciones', 'OPER', 'Operaciones y restaurantes').lastInsertRowid;

  console.log('--- Seeding positions (Cargos del modelo original) ---');
  const insertPos = db.prepare(`
    INSERT INTO positions (department_id, name, description, labor_regime_id, default_schedule_id, base_salary, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
  `);

  const pGerente = insertPos.run(dAdmin, 'GERENTE', 'Dirección estratégica y representación', r1, sAdmin, 2034.00).lastInsertRowid;
  const pConta = insertPos.run(dAdmin, 'ADMINISTRADOR / CONTADOR', 'Control contable, tributario y de nómina', r1, sAdmin, 1212.00).lastInsertRowid;
  const pSup = insertPos.run(dOper, 'SUPERVISOR DE INSTALACIONES', 'Supervisión técnica de locales y producción', r1, sAdmin, 733.00).lastInsertRowid;
  const pOper = insertPos.run(dOper, 'OPERARIO DE INSTALACIONES', 'Preparación de productos y ensamble en turnos', r1, sT1, 527.00).lastInsertRowid;

  console.log('--- Seeding the 6 demo employees from the specification ---');
  const insertEmp = db.prepare(`
    INSERT INTO employees (
      cedula, first_name, last_name, birth_date, email, phone, address,
      position_id, department_id, labor_regime_id, work_schedule_id,
      hire_date, contract_type, base_salary, status,
      bank_name, account_number, account_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INDEFINIDO', ?, 'ACTIVO', ?, ?, ?)
  `);

  const insertHist = db.prepare(`
    INSERT INTO salary_history (employee_id, previous_salary, new_salary, effective_date, user_id, reason)
    VALUES (?, ?, ?, ?, 1, ?)
  `);

  const demoEmployees = [
    {
      cedula: '1718293841', first: 'Roberto', last: 'Andrade (Gerente)',
      pos: pGerente, dept: dAdmin, regime: r1, sched: sAdmin, salary: 2034.00,
      bank: 'BANCO PICHINCHA', acc: '2100827364', accType: 'CORRIENTE', hire: '2023-01-01'
    },
    {
      cedula: '0928374615', first: 'Beatriz', last: 'Viteri (Administradora/Contadora)',
      pos: pConta, dept: dAdmin, regime: r1, sched: sAdmin, salary: 1212.00,
      bank: 'BANCO GUAYAQUIL', acc: '0019284756', accType: 'CORRIENTE', hire: '2023-03-01'
    },
    {
      cedula: '1729384756', first: 'Carlos', last: 'Mendoza (Supervisor)',
      pos: pSup, dept: dOper, regime: r1, sched: sAdmin, salary: 733.00,
      bank: 'BANCO PICHINCHA', acc: '2204589201', accType: 'AHORROS', hire: '2023-06-01'
    },
    {
      cedula: '1102938471', first: 'Juan', last: 'Pérez (Operario Turno 1)',
      pos: pOper, dept: dOper, regime: r1, sched: sT1, salary: 527.00,
      bank: 'BANCO PRODUBANCO', acc: '12093847561', accType: 'AHORROS', hire: '2024-01-15'
    },
    {
      cedula: '1709283745', first: 'María', last: 'López (Operaria Turno 2)',
      pos: pOper, dept: dOper, regime: r1, sched: sT2, salary: 527.00,
      bank: 'BANCO DEL PACIFICO', acc: '1049283746', accType: 'AHORROS', hire: '2024-02-01'
    },
    {
      cedula: '0918273645', first: 'David', last: 'Salazar (Operario Turno 3)',
      pos: pOper, dept: dOper, regime: r1, sched: sT3, salary: 527.00,
      bank: 'BANCO GUAYAQUIL', acc: '0029384712', accType: 'AHORROS', hire: '2024-02-15'
    }
  ];

  demoEmployees.forEach(e => {
    const res = insertEmp.run(
      e.cedula, e.first, e.last, '1992-05-10',
      `${e.first.toLowerCase().split(' ')[0]}@mysubs.ec`, '0991234567', 'Quito, Ecuador',
      e.pos, e.dept, e.regime, e.sched, e.hire, e.salary,
      e.bank, e.acc, e.accType
    );
    const empId = res.lastInsertRowid;
    insertHist.run(empId, 0, e.salary, e.hire, 'Contratación inicial');
  });

  console.log('--- Seeding Proposals / Scenarios (Requirement 26) ---');
  const insertProp = db.prepare('INSERT INTO proposals (name, description, created_by) VALUES (?, ?, 1)');
  const insertPropItem = db.prepare(`
    INSERT INTO proposal_items (proposal_id, position_name, labor_regime, work_schedule, monthly_salary, employee_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Propuesta 1: Estructura Actual (6 empleados)
  const prop1 = insertProp.run('Propuesta 1 - Estructura Base (6 empleados)', 'Estructura inicial del modelo con 1 Gerente, 1 Contador, 1 Supervisor y 3 Operarios en 3 turnos').lastInsertRowid;
  insertPropItem.run(prop1, 'GERENTE', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 2034.00, 1);
  insertPropItem.run(prop1, 'ADMINISTRADOR / CONTADOR', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 1212.00, 1);
  insertPropItem.run(prop1, 'SUPERVISOR DE INSTALACIONES', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 733.00, 1);
  insertPropItem.run(prop1, 'OPERARIO DE INSTALACIONES (T1)', 'CÓDIGO DE TRABAJO', '06:00 - 14:00', 527.00, 1);
  insertPropItem.run(prop1, 'OPERARIO DE INSTALACIONES (T2)', 'CÓDIGO DE TRABAJO', '14:00 - 22:00', 527.00, 1);
  insertPropItem.run(prop1, 'OPERARIO DE INSTALACIONES (T3)', 'CÓDIGO DE TRABAJO', '22:00 - 06:00', 527.00, 1);

  // Propuesta 2: Expansión de Operarios (8 empleados)
  const prop2 = insertProp.run('Propuesta 2 - Refuerzo de Turnos (8 empleados)', 'Añade 2 operarios adicionales para turnos pico de fin de semana').lastInsertRowid;
  insertPropItem.run(prop2, 'GERENTE', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 2034.00, 1);
  insertPropItem.run(prop2, 'ADMINISTRADOR / CONTADOR', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 1212.00, 1);
  insertPropItem.run(prop2, 'SUPERVISOR DE INSTALACIONES', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 733.00, 1);
  insertPropItem.run(prop2, 'OPERARIO DE INSTALACIONES', 'CÓDIGO DE TRABAJO', 'Rotativo', 527.00, 5);

  // Propuesta 3: Plena Capacidad (10 empleados)
  const prop3 = insertProp.run('Propuesta 3 - Plena Capacidad y Nuevos Locales (10 empleados)', 'Estructura para operar múltiples locales con 2 supervisores y 6 operarios').lastInsertRowid;
  insertPropItem.run(prop3, 'GERENTE', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 2034.00, 1);
  insertPropItem.run(prop3, 'ADMINISTRADOR / CONTADOR', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 1212.00, 1);
  insertPropItem.run(prop3, 'SUPERVISOR DE INSTALACIONES', 'CÓDIGO DE TRABAJO', '08H00 A 17H00', 733.00, 2);
  insertPropItem.run(prop3, 'OPERARIO DE INSTALACIONES', 'CÓDIGO DE TRABAJO', 'Rotativo', 527.00, 6);

  console.log('--- Seeding pay period (Octubre 2026) ---');
  const insertPeriod = db.prepare(`
    INSERT INTO pay_periods (name, start_date, end_date, payment_date, status, notes)
    VALUES (?, ?, ?, ?, 'CALCULADO', ?)
  `);
  const periodId = insertPeriod.run(
    'Octubre 2026', '2026-10-01', '2026-10-31', '2026-10-28',
    'Rol mensual ordinario según cuadro de remuneraciones de MYSUBS'
  ).lastInsertRowid;

  console.log('--- Generating initial payroll for period ---');
  const allEmps = db.prepare('SELECT * FROM employees').all();
  const insertPayroll = db.prepare(`
    INSERT INTO payrolls (
      period_id, employee_id, base_salary_snapshot, total_income, total_deductions,
      employer_contributions, net_salary, status, calculation_snapshot_json, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'GENERADO', ?, 1)
  `);

  const insertItem = db.prepare(`
    INSERT INTO payroll_items (payroll_id, category, code, name, value, is_taxable, is_iess, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  allEmps.forEach(emp => {
    const calc = PayrollCalculationService.calculateMonthlyPayroll({
      employee: emp,
      baseSalary: emp.base_salary,
      period: { id: periodId, name: 'Octubre 2026', start_date: '2026-10-01' }
    });

    const prId = insertPayroll.run(
      periodId, emp.id, calc.baseSalary, calc.totalIncome, calc.totalDeductions,
      calc.employerContributions, calc.netSalary, calc.snapshotJson
    ).lastInsertRowid;

    calc.items.forEach(it => {
      insertItem.run(prId, it.category, it.code, it.name, it.value, it.is_taxable, it.is_iess, it.notes);
    });
  });

  console.log('--- Seeding initial payment batch ---');
  const totalNet = db.prepare('SELECT SUM(net_salary) as total FROM payrolls WHERE period_id = ?').get(periodId).total;
  const payBatchId = db.prepare(`
    INSERT INTO payments (period_id, code, payment_date, total_amount, total_employees, status, created_by)
    VALUES (?, 'PAY-OCT-2026-001', '2026-10-28', ?, ?, 'PENDIENTE', 1)
  `).run(periodId, totalNet, allEmps.length).lastInsertRowid;

  const insertPayItem = db.prepare(`
    INSERT INTO payment_items (payment_id, payroll_id, employee_id, bank_name, account_type, account_number_masked, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')
  `);

  const payrolls = db.prepare('SELECT * FROM payrolls WHERE period_id = ?').all(periodId);
  payrolls.forEach(pr => {
    const emp = db.prepare('SELECT bank_name, account_type, account_number FROM employees WHERE id = ?').get(pr.employee_id);
    const masked = '****' + String(emp.account_number).slice(-4);
    insertPayItem.run(payBatchId, pr.id, pr.employee_id, emp.bank_name, emp.account_type, masked, pr.net_salary);
  });

  AuditService.log({
    userId: 1,
    userEmail: 'admin@mysubs.com',
    action: 'SYSTEM_INIT',
    entity: 'SYSTEM',
    entityId: '1',
    newValues: { message: 'Sistema MYSUBS inicializado con los 6 cargos y empleados de demostración' }
  });

  require('./salaryScales').initializeSalaryScales(db);
  console.log('=== DATABASE SEEDING COMPLETED SUCCESSFULLY ===');
}

if (require.main === module) {
  seedDatabase(true);
  process.exit(0);
}

module.exports = seedDatabase;
