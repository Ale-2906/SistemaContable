// Online SQLite backup includes committed WAL data without stopping the server.
require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const source = path.resolve(process.env.DATABASE_PATH || path.join(root, 'data/mysubs_nomina.sqlite'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(root, 'data/exports', `mysubs-render-${stamp}.sqlite`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const db = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await db.backup(destination);
    const copy = new Database(destination, { readonly: true });
    try {
      const integrity = copy.pragma('integrity_check', { simple: true });
      if (integrity !== 'ok' || copy.pragma('foreign_key_check').length) throw new Error('La copia no supera la verificación de integridad.');
      const total = copy.prepare('SELECT COUNT(*) AS total FROM employees').get().total;
      const active = copy.prepare("SELECT COUNT(*) AS total FROM employees WHERE status = 'ACTIVO'").get().total;
      console.log(JSON.stringify({ archivo: destination, empleados: total, activos: active, integridad: integrity }, null, 2));
    } finally { copy.close(); }
  } finally { db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
