const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mysubs-payment-test-'));
  const databasePath = path.join(dir, 'test.sqlite');
  const sourcePath = path.resolve(__dirname, '../../data/mysubs_nomina.sqlite');
  if (fs.existsSync(sourcePath)) {
    const source = new Database(sourcePath, { readonly: true });
    await source.backup(databasePath);
    source.close();
  }
  process.env.DATABASE_PATH = databasePath;
  process.env.NODE_ENV = 'test';
  const app = require('../index');
  const db = require('../config/database');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let token;
  let checks = 0;
  async function call(url, method = 'GET', body, status = 200, auth = token) {
    const response = await fetch(base + url, {
      method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json();
    assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(result)}`);
    checks++;
    return result;
  }
  const cents = value => Math.round(value * 100);
  try {
    await call('/payments', 'GET', null, 401, null);
    token = (await call('/auth/login', 'POST', { identifier: 'admin@mysubs.com', password: 'admin123' })).token;
    const period = await call('/periods', 'POST', { name: `Prueba flujo ${Date.now()}`, startDate: '2026-11-01', endDate: '2026-11-30', paymentDate: '2026-11-30' }, 201);
    const periodId = period.id;
    await call('/payrolls/approve', 'POST', { periodId }, 400);
    const generated = await call('/payrolls/generate', 'POST', { periodId });
    const employees = await call('/employees');
    assert.equal(generated.count, employees.filter(e => e.status === 'ACTIVO').length);
    const payroll = await call(`/payrolls?periodId=${periodId}`);
    assert.equal(payroll.items.length, generated.count);
    for (const row of payroll.items) {
      const slip = await call(`/payrolls/${row.id}`);
      assert.equal(cents(row.net_salary), cents(row.total_income) - cents(row.total_deductions));
      assert.equal(cents(row.total_income), slip.earnings.reduce((sum, x) => sum + cents(x.value), 0));
      assert.equal(cents(row.total_deductions), slip.deductions.reduce((sum, x) => sum + cents(x.value), 0));
      assert.equal(cents(row.employer_contributions), slip.employerItems.reduce((sum, x) => sum + cents(x.value), 0));
    }
    await call('/payrolls/generate', 'POST', { periodId });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM payrolls WHERE period_id = ?').get(periodId).n, generated.count);
    assert.equal((await call(`/periods/${periodId}`)).status, 'CALCULADO');
    const consulta = (await call('/auth/login', 'POST', { identifier: 'consulta@mysubs.com', password: 'consulta123' })).token;
    await call('/payrolls/approve', 'POST', { periodId }, 403, consulta);
    await call('/payrolls/approve', 'POST', { periodId });
    assert.equal((await call(`/periods/${periodId}`)).status, 'CERRADO');
    const payments = await call('/payments');
    const payment = payments.find(p => p.period_id === periodId);
    assert.ok(payment);
    assert.equal(payment.status, 'PENDIENTE');
    const batch = await call(`/payments/${payment.id}`);
    assert.equal(batch.items.length, generated.count);
    assert.equal(cents(payment.total_amount), payroll.items.reduce((sum, x) => sum + cents(x.net_salary), 0));
    assert.equal(cents(payment.total_amount), batch.items.reduce((sum, x) => sum + cents(x.amount), 0));
    db.prepare('UPDATE payments SET total_amount = total_amount + 1 WHERE id = ?').run(payment.id);
    await call(`/payments/${payment.id}/mark-paid`, 'PUT', {}, 409);
    db.prepare('UPDATE payments SET total_amount = ? WHERE id = ?').run(payment.total_amount, payment.id);
    await call('/payrolls/approve', 'POST', { periodId }, 409);
    await call('/payrolls/generate', 'POST', { periodId }, 409);
    await call(`/payments/${payment.id}/mark-paid`, 'PUT', {}, 403, consulta);
    await call(`/payments/${payment.id}/mark-paid`, 'PUT', { paymentMethod: 'TRANSFERENCIA', referencePrefix: 'PRUEBA' });
    const paid = await call(`/payments/${payment.id}`);
    assert.equal(paid.payment.status, 'PAGADO');
    assert.ok(paid.items.every(x => x.status === 'PAGADO' && x.reference_number && x.paid_at));
    assert.equal((await call(`/periods/${periodId}`)).status, 'PAGADO');
    assert.ok((await call(`/payrolls?periodId=${periodId}`)).items.every(x => x.status === 'PAGADO'));
    await call(`/payments/${payment.id}/mark-paid`, 'PUT', {}, 409);
    await call('/payrolls/generate', 'POST', { periodId }, 409);
    await call('/payrolls/approve', 'POST', { periodId }, 409);
    await call(`/periods/${periodId}/status`, 'PUT', { status: 'ABIERTO' }, 409);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM payments WHERE period_id = ?').get(periodId).n, 1);
    for (const route of ['/reports/employees.csv', `/reports/payroll/${periodId}.csv`, '/remunerations/export/excel']) {
      const response = await fetch(base + route, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('content-disposition').includes('attachment'));
      if (route.endsWith('/excel')) {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
        assert.equal(rows.filter(row => typeof row[0] === 'number').length, generated.count);
      } else {
        const csv = await response.text();
        for (const employee of employees.filter(e => e.status === 'ACTIVO')) assert.ok(csv.includes(employee.first_name));
        if (route.includes('/payroll/')) assert.ok(csv.includes(payment.total_amount.toFixed(2)));
      }
      checks++;
    }
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    const audit = db.prepare("SELECT action FROM audit_logs WHERE action IN ('GENERATE_PAYROLL', 'APPROVE_PAYROLL', 'PAYMENT_PROCESSED') AND entity_id IN (?, ?)").all(String(periodId), String(payment.id));
    for (const action of ['GENERATE_PAYROLL', 'APPROVE_PAYROLL', 'PAYMENT_PROCESSED']) assert.ok(audit.some(x => x.action === action));
    console.log(`PASS: ${checks} solicitudes verificadas; ${generated.count} empleados; total pagado $${payment.total_amount.toFixed(2)}; base original sin cambios.`);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(databasePath + suffix)) fs.unlinkSync(databasePath + suffix);
    fs.rmdirSync(dir);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
