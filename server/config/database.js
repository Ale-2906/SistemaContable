const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const exportsDir = path.resolve(__dirname, '../../data/exports');
let dbPath;

if (process.env.DATABASE_PATH) {
  dbPath = path.resolve(process.env.DATABASE_PATH);
} else {
  if (!fs.existsSync(exportsDir)) {
    throw new Error(`No existe la carpeta: ${exportsDir}`);
  }

  const files = fs.readdirSync(exportsDir)
    .filter(name => /\.(sqlite|sqlite3|db)$/i.test(name))
    .map(name => {
      const filePath = path.join(exportsDir, name);
      return { filePath, stat: fs.statSync(filePath) };
    })
    .filter(file => file.stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  if (!files.length) {
    throw new Error('No se encontró una base SQLite en data/exports.');
  }

  dbPath = files[0].filePath;
}

const db = new Database(dbPath, { fileMustExist: true });

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Base de datos utilizada:', dbPath);

module.exports = db;