const assert = require('assert');
const PayrollCalculationService = require('../services/PayrollCalculationService');
const db = require('../config/database');

console.log('>>> EJECUTANDO SUITE DE PRUEBAS DE REMUNERACIONES MYSUBS <<<');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FALLO: ${desc}`);
    console.error(`    ${err.message}`);
  }
}

// 1. Exact tests matching the specification examples
console.log('\n[1] Verificación con ejemplos exactos de la especificación:');

it('Calcula correctamente el cargo GERENTE ($2034.00)', () => {
  const params = {
    patronalRate: 12.15,
    personalRate: 9.45,
    reserveFundRate: 8.33,
    decimo14Base: 460.00
  };

  const res = PayrollCalculationService.calculateRemunerationRow({
    monthlySalary: 2034.00,
    parameters: params
  });

  assert.strictEqual(res.monthlySalary, 2034.00);
  assert.strictEqual(res.aportePatronal, 247.13); // 2034 * 0.1215
  assert.strictEqual(res.aportePersonal, 192.21); // 2034 * 0.0945
  assert.strictEqual(res.decimo14Mensual, 38.33); // 460 / 12
  assert.strictEqual(res.decimo13Mensual, 169.50); // 2034 / 12
  assert.strictEqual(res.fondosReserva, 169.43); // 2034 * 0.0833
  assert.strictEqual(res.rumConDecimos, 2219.05); // 2034 - 192.21 + 38.33 + 169.50 + 169.43
  assert.strictEqual(res.rumSinDecimos, 1841.79); // 2034 - 192.21
  assert.strictEqual(res.costoTotalEmpresa, 2658.39); // 2034 + 247.13 + 38.33 + 169.50 + 169.43
});

it('Calcula correctamente el cargo OPERARIO DE INSTALACIONES ($527.00)', () => {
  const params = {
    patronalRate: 12.15,
    personalRate: 9.45,
    reserveFundRate: 8.33,
    decimo14Base: 460.00
  };

  const res = PayrollCalculationService.calculateRemunerationRow({
    monthlySalary: 527.00,
    parameters: params
  });

  assert.strictEqual(res.monthlySalary, 527.00);
  assert.strictEqual(res.aportePatronal, 64.03); // 527 * 0.1215 = 64.0305 -> 64.03
  assert.strictEqual(res.aportePersonal, 49.80); // 527 * 0.0945 = 49.8015 -> 49.80
  assert.strictEqual(res.decimo14Mensual, 38.33);
  assert.strictEqual(res.decimo13Mensual, 43.92); // 527 / 12 = 43.9166 -> 43.92
  assert.strictEqual(res.fondosReserva, 43.90); // 527 * 0.0833 = 43.8991 -> 43.90
  assert.strictEqual(res.rumConDecimos, 603.35); // 527 - 49.80 + 38.33 + 43.92 + 43.90
  assert.strictEqual(res.rumSinDecimos, 477.20); // 527 - 49.80
  assert.strictEqual(res.costoTotalEmpresa, 717.18); // 527 + 64.03 + 38.33 + 43.92 + 43.90
});

console.log('\n[2] Verificación de Base de Datos y Parametrización:');

it('Verifica la integridad de los empleados configurados sin exigir datos de demostracion', () => {
  assert.deepStrictEqual(db.pragma('foreign_key_check'), []);
  const invalid = db.prepare(`SELECT COUNT(*) AS count FROM employees
    WHERE trim(first_name) = '' OR trim(last_name) = '' OR base_salary < 0`).get();
  assert.strictEqual(invalid.count, 0);
});

it('Redondea medios centavos en salarios configurados', () => {
  const personal = [1450, 1100, 850].map(monthlySalary =>
    PayrollCalculationService.calculateRemunerationRow({ monthlySalary }).aportePersonal);
  assert.deepStrictEqual(personal, [137.03, 103.95, 80.33]);
});

it('Verifica que los parámetros de nómina sean consultables y configurables', () => {
  const params = db.prepare('SELECT * FROM payroll_parameters').all();
  assert(params.length >= 4, 'Debe existir parámetros para Aporte Patronal, Personal, Fondos y Décimo cuarto');
});

it('Verifica las propuestas y escenarios de personal', () => {
  const proposals = db.prepare('SELECT * FROM proposals').all();
  assert(proposals.length >= 3, 'Debe haber al menos 3 propuestas (Propuesta 1, 2, 3)');
});

console.log(`\n===============================================`);
console.log(` RESULTADOS: ${passedTests}/${totalTests} pruebas pasadas con éxito`);
console.log(`===============================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
