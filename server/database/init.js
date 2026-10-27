const db = require('../config/database');

function initializeDatabase() {
  db.exec(`
    -- Roles
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    -- Departments
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Labor Regimes (Régimen Laboral: Código de Trabajo, LOEP, etc.)
    CREATE TABLE IF NOT EXISTS labor_regimes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Work Schedules (Jornadas y Horarios)
    CREATE TABLE IF NOT EXISTS work_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      daily_hours REAL DEFAULT 8.0,
      schedule_type TEXT DEFAULT 'DIURNA',
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Positions (Cargos)
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      labor_regime_id INTEGER,
      default_schedule_id INTEGER,
      base_salary REAL NOT NULL DEFAULT 460.00,
      status TEXT DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
      FOREIGN KEY (labor_regime_id) REFERENCES labor_regimes(id) ON DELETE SET NULL,
      FOREIGN KEY (default_schedule_id) REFERENCES work_schedules(id) ON DELETE SET NULL
    );

    -- Employees (Colaboradores)
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      position_id INTEGER NOT NULL,
      department_id INTEGER NOT NULL,
      labor_regime_id INTEGER,
      work_schedule_id INTEGER,
      hire_date TEXT NOT NULL,
      termination_date TEXT,
      contract_type TEXT NOT NULL DEFAULT 'INDEFINIDO',
      base_salary REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVO',
      bank_name TEXT NOT NULL DEFAULT 'BANCO PICHINCHA',
      account_number TEXT NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'AHORROS',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (labor_regime_id) REFERENCES labor_regimes(id),
      FOREIGN KEY (work_schedule_id) REFERENCES work_schedules(id)
    );

    -- Salary History (Historial salarial inmutable)
    CREATE TABLE IF NOT EXISTS salary_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      previous_salary REAL NOT NULL,
      new_salary REAL NOT NULL,
      effective_date TEXT NOT NULL,
      user_id INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Configurable Payroll Parameters (Parámetros legales configurables con vigencia)
    CREATE TABLE IF NOT EXISTS payroll_parameters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT DEFAULT '%',
      effective_start_date TEXT NOT NULL,
      effective_end_date TEXT,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Parameter Audit History
    CREATE TABLE IF NOT EXISTS parameter_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parameter_code TEXT NOT NULL,
      previous_value REAL NOT NULL,
      new_value REAL NOT NULL,
      reason TEXT,
      user_id INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Pay Periods (Períodos de nómina)
    CREATE TABLE IF NOT EXISTS pay_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'BORRADOR',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Employee Novelties (Novedades de Ingresos y Descuentos)
    CREATE TABLE IF NOT EXISTS employee_novelties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('INGRESO', 'DESCUENTO')),
      type TEXT NOT NULL,
      description TEXT,
      hours REAL DEFAULT 0,
      value REAL NOT NULL,
      date TEXT NOT NULL,
      user_id INTEGER,
      status TEXT NOT NULL DEFAULT 'ACTIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (period_id) REFERENCES pay_periods(id) ON DELETE RESTRICT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Payrolls (Roles y cálculos guardados por período)
    CREATE TABLE IF NOT EXISTS payrolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      base_salary_snapshot REAL NOT NULL,
      total_income REAL NOT NULL DEFAULT 0,
      total_deductions REAL NOT NULL DEFAULT 0,
      employer_contributions REAL NOT NULL DEFAULT 0,
      net_salary REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'GENERADO',
      calculation_snapshot_json TEXT,
      created_by INTEGER,
      approved_by INTEGER,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(period_id, employee_id),
      FOREIGN KEY (period_id) REFERENCES pay_periods(id) ON DELETE RESTRICT,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Payroll Items (Desglose línea por línea)
    CREATE TABLE IF NOT EXISTS payroll_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('INGRESO', 'DESCUENTO', 'PATRONAL')),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      is_taxable INTEGER DEFAULT 1,
      is_iess INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON DELETE CASCADE
    );

    -- Payments (Lotes de pago)
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      total_employees INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDIENTE',
      created_by INTEGER,
      approved_by INTEGER,
      processed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (period_id) REFERENCES pay_periods(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Payment Items (Detalle por empleado con método de pago)
    CREATE TABLE IF NOT EXISTS payment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      payroll_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      bank_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      account_number_masked TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'TRANSFERENCIA',
      status TEXT NOT NULL DEFAULT 'PENDIENTE',
      reference_number TEXT,
      paid_at DATETIME,
      notes TEXT,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      FOREIGN KEY (payroll_id) REFERENCES payrolls(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    -- Proposals / Scenarios (Propuestas de Escenarios de Personal: Propuesta 1, 2, 3)
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Proposal Items (Detalle de empleados/cargos de la propuesta)
    CREATE TABLE IF NOT EXISTS proposal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      position_name TEXT NOT NULL,
      labor_regime TEXT NOT NULL DEFAULT 'CÓDIGO DE TRABAJO',
      work_schedule TEXT NOT NULL DEFAULT '08H00 A 17H00',
      monthly_salary REAL NOT NULL,
      employee_count INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    -- Company Profile Settings
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      ruc TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      currency_symbol TEXT DEFAULT '$',
      logo_url TEXT,
      receipt_footer_text TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Audit Logs (Auditoría inmutable)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    CREATE INDEX IF NOT EXISTS idx_payrolls_period ON payrolls(period_id);
    CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(period_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  // Additive migrations preserve existing employees and historical payroll snapshots.
  const addColumn = (table, name, definition) => {
    if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
  };
  const initializeHierarchy = !db.prepare('PRAGMA table_info(positions)').all().some(c => c.name === 'parent_position_id');
  addColumn('positions', 'parent_position_id', 'INTEGER REFERENCES positions(id)');
  addColumn('positions', 'salary_grade', "TEXT DEFAULT ''");
  addColumn('positions', 'salary_min', 'REAL');
  addColumn('positions', 'salary_max', 'REAL');
  addColumn('employees', 'decimo13_mode', "TEXT NOT NULL DEFAULT 'ANUAL'");
  addColumn('employees', 'decimo14_mode', "TEXT NOT NULL DEFAULT 'ANUAL'");
  addColumn('employees', 'decimo14_month', 'INTEGER NOT NULL DEFAULT 8');
  addColumn('employees', 'annual_tax_rebate', 'REAL NOT NULL DEFAULT 0');
  addColumn('employees', 'annual_tax_exemption', 'REAL NOT NULL DEFAULT 0');
  addColumn('employees', 'tax_year', 'INTEGER NOT NULL DEFAULT 2026');
  if (initializeHierarchy) {
    const positions = db.prepare('SELECT * FROM positions ORDER BY id').all();
    const director = positions.find(p => p.name.toUpperCase() === 'GERENTE GENERAL');
    if (director) {
      const update = db.prepare('UPDATE positions SET parent_position_id=? WHERE id=?');
      for (const position of positions) {
        if (position.id === director.id) continue;
        const head = positions.find(p => p.department_id === position.department_id && /^JEF[EA] /.test(p.name.toUpperCase()));
        update.run(head && head.id !== position.id ? head.id : director.id, position.id);
      }
    }
  }


  // Keep historical amounts frozen; only open legacy drafts must be recalculated.
  db.transaction(()=>{
    const roles=db.prepare("SELECT pr.id,pr.calculation_snapshot_json FROM payrolls pr JOIN pay_periods pp ON pp.id=pr.period_id WHERE pr.status='GENERADO' AND pp.status IN ('BORRADOR','ABIERTO','CALCULADO')").all();
    for(const role of roles){
      let version=0;
      try{version=JSON.parse(role.calculation_snapshot_json || '{}').tax?.version || 0;}catch{}
      if(version>=2)continue;
      db.prepare("UPDATE payrolls SET status='DESACTUALIZADO' WHERE id=?").run(role.id);
      db.prepare("INSERT INTO audit_logs (action,entity,entity_id,new_values) VALUES ('TAX_RULES_UPDATED','PAYROLL',?,?)").run(String(role.id),JSON.stringify({status:'DESACTUALIZADO',reason:'Revisión SRI artículo 104: enero sin retención y cuotas febrero-diciembre'}));
    }
  })();

  require('./salaryScales').initializeSalaryScales(db);

  console.log('Database tables, constraints, and indexes initialized successfully.');
}

module.exports = initializeDatabase;
