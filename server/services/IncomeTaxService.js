const round = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const TABLES = {
  2026: [
    [0, 0, 0],
    [12208, 0, 5],
    [15549, 167, 10],
    [20188, 631, 12],
    [26700, 1412, 15],
    [35136, 2678, 20],
    [46575, 4965, 25],
    [62005, 8823, 30],
    [82679, 15025, 35],
    [109956, 24572, 37],
  ],
};
// Official sources and effective fiscal year are part of every calculation snapshot.
const SOURCES = {
  regulation:
    "https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/ee775a90-0ba9-48fe-85cb-9a52673c4c61/REGLAMENTO_PARA_APLICACION_LEY_DE_REGIMEN_TRIBUTARIO_INTERNO_LRTI.pdf",
  table:
    "https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar?id=bb7aac3c-251d-4243-9477-10a3ba8e7355&nombre=NAC-DGERCGC25-00000043.pdf",
  expenses:
    "https://www.sri.gob.ec/detalle-noticias?idnoticia=1324&marquesina=1",
};
class IncomeTaxService {
  static annualTax(base, year = 2026, rebate = 0) {
    if (!TABLES[year])
      throw new Error(
        `No hay tabla de impuesto a la renta configurada para ${year}`,
      );
    if (
      ![base, rebate].every((n) => Number.isFinite(Number(n)) && Number(n) >= 0)
    )
      throw new Error("Base o rebaja de renta inválida");
    const bracket =
      TABLES[year].findLast((row) => base >= row[0]) || TABLES[year][0];
    return round(
      Math.max(
        0,
        bracket[1] +
          (Math.max(0, base - bracket[0]) * bracket[2]) / 100 -
          rebate,
      ),
    );
  }
  static expenseRebate({
    expenses = 0,
    dependents = 0,
    special = false,
    galapagos = false,
    year = 2026,
  } = {}) {
    if (year !== 2026)
      throw new Error("La rebaja de gastos está configurada para 2026");
    if (
      !Number.isFinite(Number(expenses)) ||
      Number(expenses) < 0 ||
      !Number.isInteger(Number(dependents)) ||
      Number(dependents) < 0
    )
      throw new Error("Gastos o cargas familiares inválidos");
    const baskets = special
      ? 100
      : [7, 9, 11, 14, 17, 20][Math.min(5, Number(dependents))];
    const ceiling = round(821.8 * baskets * (galapagos ? 1.803 : 1));
    return {
      year,
      baskets,
      ceiling,
      eligibleExpenses: Math.min(Number(expenses), ceiling),
      rebate: round(Math.min(Number(expenses), ceiling) * 0.18),
    };
  }
  static calculate({
    employee = {},
    salary,
    earned,
    currentIess,
    period = {},
    personalRate = 9.45,
    history = [],
  }) {
    const date = period.start_date || "2026-01-01",
      year = Number(date.slice(0, 4)),
      month = Number(date.slice(5, 7));
    if (!TABLES[year] || month < 1 || month > 12)
      throw new Error(`Período tributario no configurado: ${date}`);
    const fiscalYear = Number(employee.tax_year || 2026),
      benefitsApply = fiscalYear === year;
    const rebate = benefitsApply ? Number(employee.annual_tax_rebate || 0) : 0,
      exemption = benefitsApply
        ? Number(employee.annual_tax_exemption || 0)
        : 0;
    if (
      ![salary, earned, currentIess, personalRate, rebate, exemption].every(
        (n) => Number.isFinite(Number(n)) && Number(n) >= 0,
      )
    )
      throw new Error("Valores de proyección tributaria inválidos");
    const hire = employee.hire_date || `${year}-01-01`;
    const hireYear = Number(hire.slice(0, 4));
    const startMonth =
      hireYear === year ? Number(hire.slice(5, 7)) : hireYear > year ? 13 : 1;
    const eligibleHistory = history.filter(
      (h) => h.month >= startMonth && h.month < month,
    );
    const priorIncome = round(
      eligibleHistory.reduce((s, h) => s + Number(h.income || 0), 0),
    );
    const priorIess = round(
      eligibleHistory.reduce((s, h) => s + Number(h.iess || 0), 0),
    );
    const withheld = round(
      eligibleHistory.reduce((s, h) => s + Number(h.withheld || 0), 0),
    );
    const covered = new Set(eligibleHistory.map((h) => h.month));
    const missingMonths = [];
    for (let m = startMonth; m < month; m++)
      if (!covered.has(m)) missingMonths.push(m);
    const futureMonths = 12 - month;
    const projectedMonths = missingMonths.length + futureMonths;
    const annualIncome = round(
      priorIncome + Number(earned) + Number(salary) * projectedMonths,
    );
    const annualIess = round(
      priorIess +
        Number(currentIess) +
        round((salary * personalRate) / 100) * projectedMonths,
    );
    const annualBase = round(
      Math.max(0, annualIncome - annualIess - exemption),
    );
    const taxBeforeRebate = this.annualTax(annualBase, year),
      annualTax = round(Math.max(0, taxBeforeRebate - rebate));
    const historyComplete = missingMonths.length === 0;
    // Ordinary annual quota is /11, never /12. Reliquidate only with complete prior records.
    const method =
      month === 1
        ? "ENERO_SIN_RETENCION"
        : historyComplete
          ? "RELIQUIDACION"
          : "CUOTA_ORDINARIA_HISTORIAL_INCOMPLETO";
    const installments = month === 1 ? 0 : historyComplete ? 13 - month : 11;
    const balance = round(Math.max(0, annualTax - withheld));
    const monthlyWithholding =
      month === 1
        ? 0
        : round(
            historyComplete
              ? balance / installments
              : Math.min(annualTax / 11, balance),
          );
    const warnings = [];
    if (!historyComplete)
      warnings.push(
        `Faltan roles aprobados de los meses ${missingMonths.join(", ")}. Se estima su sueldo base y se usa la cuota ordinaria /11; no se realiza una reliquidación definitiva.`,
      );
    if (!benefitsApply)
      warnings.push(
        `Los beneficios registrados son de ${fiscalYear} y no se aplican en ${year}.`,
      );
    return {
      version: 2,
      year,
      month,
      currentTaxableIncome: round(earned),
      currentIess: round(currentIess),
      annualIncome,
      annualIess,
      annualBase,
      taxBeforeRebate,
      rebate,
      exemption,
      annualTax,
      withheld,
      balance,
      installments,
      monthlyWithholding,
      historyComplete,
      missingMonths,
      method,
      warnings,
      sources: SOURCES,
      assumptions:
        "Los meses sin roles aprobados y los meses futuros se proyectan con el sueldo base. Las horas extra actuales se incluyen una sola vez. No incluye ingresos de otros empleadores ni liquidaciones por terminación.",
    };
  }
}
module.exports = IncomeTaxService;
