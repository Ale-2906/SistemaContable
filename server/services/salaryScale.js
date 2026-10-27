const db = require('../config/database');
module.exports = function validateSalary(positionId, salary, departmentId) {
  const position = db.prepare('SELECT * FROM positions WHERE id=?').get(positionId);
  if (!position) return 'Cargo no encontrado';
  if (departmentId != null && Number(departmentId) !== position.department_id) return 'El cargo no pertenece al departamento seleccionado';
  const value = Number(salary);
  if (!Number.isFinite(value) || value < 0) return 'Sueldo inválido';
  if ((position.salary_min != null && value < position.salary_min) || (position.salary_max != null && value > position.salary_max)) return 'El sueldo debe estar dentro de la escala salarial del cargo';
  return null;
};
