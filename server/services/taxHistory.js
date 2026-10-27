const db = require("../config/database");
module.exports = function taxHistory(employeeId, period) {
  if (!employeeId) return [];
  const year = Number(period.start_date.slice(0, 4));
  return db
    .prepare(
      `SELECT CAST(strftime('%m', pp.start_date) AS INTEGER) AS month,
  SUM(CASE WHEN i.category='INGRESO' AND i.code NOT LIKE 'DECIMO_%' AND i.code NOT LIKE 'PAGO_ANUAL_DECIMO_%' AND i.code<>'FONDOS_RESERVA' THEN i.value ELSE 0 END) AS income,
  SUM(CASE WHEN i.code='IESS_PERSONAL' THEN i.value ELSE 0 END) AS iess,
  SUM(CASE WHEN i.code='IMPUESTO_RENTA' THEN i.value ELSE 0 END) AS withheld
 FROM payrolls pr JOIN pay_periods pp ON pp.id=pr.period_id JOIN payroll_items i ON i.payroll_id=pr.id
 WHERE pr.employee_id=? AND pp.start_date>=? AND pp.start_date<?
 AND pr.status IN ('APROBADO','PAGADO') AND pp.status IN ('CERRADO','PAGADO')
 GROUP BY strftime('%m',pp.start_date) ORDER BY month`,
    )
    .all(employeeId, `${year}-01-01`, period.start_date);
};
