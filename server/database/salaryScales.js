// Configurable internal company policy; not an official sector wage table.
const DEFAULT_SCALES = [
  { code: "G1", label: "Apoyo y operación", min: 500, max: 900, order: 1 },
  { code: "G2", label: "Técnico y comercial", min: 900, max: 1200, order: 2 },
  {
    code: "G3",
    label: "Profesional y analista",
    min: 1000,
    max: 1600,
    order: 3,
  },
  {
    code: "G4",
    label: "Coordinación y supervisión",
    min: 1200,
    max: 1800,
    order: 4,
  },
  { code: "G5", label: "Jefaturas", min: 1500, max: 2400, order: 5 },
  { code: "G6", label: "Gerencia y dirección", min: 2000, max: 3500, order: 6 },
];
function gradeFor(name) {
  const n = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (/^(GERENTE|DIRECTOR|DIRECTORA)\b/.test(n)) return "G6";
  if (/^(JEFE|JEFA)\b/.test(n)) return "G5";
  if (/^(COORDINADOR|COORDINADORA|SUPERVISOR|SUPERVISORA)\b/.test(n))
    return "G4";
  if (
    /^(ANALISTA|DESARROLLADOR|DESARROLLADORA|DISENADOR|DISENADORA|CONTADOR|CONTADORA|ADMINISTRADOR|ADMINISTRADORA)\b/.test(
      n,
    )
  )
    return "G3";
  if (/^(ESPECIALISTA|TECNICO|TECNICA|EJECUTIVO|EJECUTIVA)\b/.test(n))
    return "G2";
  if (/^(ASISTENTE|OPERARIO|OPERARIA|AUXILIAR)\b/.test(n)) return "G1";
  return null;
}
function initializeSalaryScales(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS salary_scales (
 code TEXT PRIMARY KEY,label TEXT NOT NULL,min_salary REAL NOT NULL,max_salary REAL NOT NULL,sort_order INTEGER NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,CHECK(min_salary>=0 AND max_salary>=min_salary))`);
  return db.transaction(() => {
    const insert = db.prepare(
      "INSERT OR IGNORE INTO salary_scales (code,label,min_salary,max_salary,sort_order) VALUES (?,?,?,?,?)",
    );
    DEFAULT_SCALES.forEach((s) =>
      insert.run(s.code, s.label, s.min, s.max, s.order),
    );
    const scales = new Map(
      db
        .prepare("SELECT * FROM salary_scales")
        .all()
        .map((s) => [s.code, s]),
    );
    const positions = db
      .prepare(
        "SELECT * FROM positions WHERE (salary_grade IS NULL OR trim(salary_grade)='') AND salary_min IS NULL AND salary_max IS NULL",
      )
      .all();
    const changed = [];
    for (const position of positions) {
      const scale = scales.get(gradeFor(position.name));
      if (!scale) continue;
      // Assign bands only. Never change position references, employees, history or payrolls.
      db.prepare(
        "UPDATE positions SET salary_grade=?,salary_min=?,salary_max=? WHERE id=?",
      ).run(scale.code, scale.min_salary, scale.max_salary, position.id);
      const values = {
        salary_grade: scale.code,
        salary_min: scale.min_salary,
        salary_max: scale.max_salary,
      };
      db.prepare(
        "INSERT INTO audit_logs (action,entity,entity_id,old_values,new_values) VALUES ('ASSIGN_INTERNAL_SALARY_SCALE','POSITION',?,?,?)",
      ).run(
        String(position.id),
        JSON.stringify({
          salary_grade: position.salary_grade,
          salary_min: position.salary_min,
          salary_max: position.salary_max,
        }),
        JSON.stringify(values),
      );
      changed.push({ id: position.id, ...values });
    }
    return changed;
  })();
}
module.exports = { DEFAULT_SCALES, gradeFor, initializeSalaryScales };
