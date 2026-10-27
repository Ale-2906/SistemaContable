const IncomeTaxService = require('./IncomeTaxService');
/**
 * Helper para redondeo financiero exacto a 2 decimales evitando artefactos de punto flotante
 */
function roundMoney(val) {
  const scaled = Number(val) * 100;
  return Math.round(scaled + Number.EPSILON * Math.abs(scaled)) / 100;
}

/**
 * PayrollCalculationService
 * Motor de cálculo independiente y configurable para nómina y remuneraciones (MYSUBS - Ecuador)
 */
class PayrollCalculationService {
  /**
   * Obtiene los parámetros vigentes o devuelve los valores por defecto si no existen
   */
  static getDefaultParameters() {
    return {
      patronalRate: 12.15,      // % Aporte Patronal
      personalRate: 9.45,       // % Aporte Personal
      reserveFundRate: 8.33,    // % Fondos de Reserva
      decimo14Base: 460.00,     // SBU Anual para Décimo Cuarto
      overtime50Mult: 1.5,      // Multiplicador 50%
      overtime100Mult: 2.0,     // Multiplicador 100%
      monthlyHours: 240         // Base mensual de horas
    };
  }

  /**
   * Calcula una fila completa del CUADRO DE REMUNERACIONES (Estructura oficial del modelo)
   * 
   * @param {Object} params
   * @param {number} params.monthlySalary - Remuneración Mensual
   * @param {Object} [params.parameters] - Parámetros legales configurables
   * @returns {Object} Valores exactos calculados
   */
  static calculateRemunerationRow({ monthlySalary, parameters = {} }) {
    const salary = Number(monthlySalary || 0);

    const patronalRate = Number(parameters.patronalRate ?? 12.15);
    const personalRate = Number(parameters.personalRate ?? 9.45);
    const reserveFundRate = Number(parameters.reserveFundRate ?? 8.33);
    const decimo14Base = Number(parameters.decimo14Base ?? 460.00);

    // 1. APORTE PATRONAL = Remuneración Mensual ? % Aporte Patronal
    const aportePatronal = roundMoney((salary * patronalRate) / 100);

    // 2. APORTE PERSONAL = Remuneración Mensual ? % Aporte Personal
    const aportePersonal = roundMoney((salary * personalRate) / 100);

    // 3. DÉCIMO CUARTO (Anual) y DÉCIMO CUARTO MENSUAL = Décimo cuarto / 12
    const decimo14Anual = roundMoney(decimo14Base);
    const decimo14Mensual = roundMoney(decimo14Anual / 12);

    // 4. DÉCIMO TERCERO = Remuneración Mensual y DÉCIMO TERCERO MENSUAL = Décimo tercero / 12
    const decimo13Anual = roundMoney(salary);
    const decimo13Mensual = roundMoney(decimo13Anual / 12);

    // 5. FONDOS DE RESERVA = Remuneración Mensual ? % Fondos de Reserva
    const fondosReserva = roundMoney((salary * reserveFundRate) / 100);

    // 6. RUM MENSUAL CON DÉCIMOS = Remuneración - Aporte Personal + Décimo cuarto Mensual + Décimo tercero Mensual + Fondos de Reserva
    const rumConDecimos = roundMoney(salary - aportePersonal + decimo14Mensual + decimo13Mensual + fondosReserva);

    // 7. RUM MENSUAL SIN DÉCIMOS = Remuneración - Aporte Personal
    const rumSinDecimos = roundMoney(salary - aportePersonal);

    // 8. COSTO TOTAL PARA MYSUBS = Remuneración + Aporte Patronal + Décimo cuarto Mensual + Décimo tercero Mensual + Fondos de Reserva
    const costoTotalEmpresa = roundMoney(salary + aportePatronal + decimo14Mensual + decimo13Mensual + fondosReserva);

    // Costo Anual Proyectado
    const costoAnualEmpresa = roundMoney(costoTotalEmpresa * 12);

    return {
      monthlySalary: salary,
      aportePatronal,
      aportePersonal,
      decimo14Anual,
      decimo14Mensual,
      decimo13Anual,
      decimo13Mensual,
      fondosReserva,
      rumConDecimos,
      rumSinDecimos,
      costoTotalEmpresa,
      costoAnualEmpresa,
      ratesUsed: {
        patronalRate,
        personalRate,
        reserveFundRate,
        decimo14Base
      }
    };
  }

  /**
   * Suma todas las columnas monetarias de un listado de filas del Cuadro de Remuneraciones
   */
  static calculateTotals(rows = []) {
    return rows.reduce(
      (acc, r) => {
        acc.employeeCount += 1;
        acc.monthlySalary += Number(r.monthlySalary || 0);
        acc.aportePatronal += Number(r.aportePatronal || 0);
        acc.aportePersonal += Number(r.aportePersonal || 0);
        acc.decimo14Anual += Number(r.decimo14Anual || 0);
        acc.decimo14Mensual += Number(r.decimo14Mensual || 0);
        acc.decimo13Anual += Number(r.decimo13Anual || 0);
        acc.decimo13Mensual += Number(r.decimo13Mensual || 0);
        acc.fondosReserva += Number(r.fondosReserva || 0);
        acc.rumConDecimos += Number(r.rumConDecimos || 0);
        acc.rumSinDecimos += Number(r.rumSinDecimos || 0);
        acc.costoTotalEmpresa += Number(r.costoTotalEmpresa || 0);
        acc.costoAnualEmpresa += Number(r.costoAnualEmpresa || 0);
        return acc;
      },
      {
        employeeCount: 0,
        monthlySalary: 0,
        aportePatronal: 0,
        aportePersonal: 0,
        decimo14Anual: 0,
        decimo14Mensual: 0,
        decimo13Anual: 0,
        decimo13Mensual: 0,
        fondosReserva: 0,
        rumConDecimos: 0,
        rumSinDecimos: 0,
        costoTotalEmpresa: 0,
        costoAnualEmpresa: 0
      }
    );
  }

  /**
   * Calcula el rol de pago mensual para un empleado considerando novedades adicionales (horas extras, anticipos, bonos)
   */
  static calculateAnnualIncomeTax(base, year = 2026, rebate = 0) {
    return IncomeTaxService.annualTax(base, year, rebate);
  }

  static calculateMonthlyPayroll({ employee, baseSalary, period, novelties = [], parameters = {}, annualBenefits = {}, taxHistory = [] }) {
    const salary = Number(baseSalary || 0);
    if (!Number.isFinite(salary) || salary < 0) throw new Error('Sueldo inválido');
    const config = { ...this.getDefaultParameters(), ...parameters };
    const items = [];
    const add = (category, code, name, value, notes = '', taxable = 0, iess = 0) => {
      items.push({ category, code, name, value: roundMoney(value), notes, is_taxable: taxable, is_iess: iess });
    };
    add('INGRESO', 'SUELDO_BASE', 'Remuneración Mensual', salary, 'Sueldo base pactado', 1, 1);
    for (const nov of novelties) {
      if (nov.status === 'ANULADO') continue;
      const overtime = ['HORAS_EXTRA_50', 'HORAS_EXTRA_100'].includes(nov.type);
      const multiplier = nov.type === 'HORAS_EXTRA_50' ? config.overtime50Mult : config.overtime100Mult;
      const value = overtime ? roundMoney(salary / config.monthlyHours * Number(nov.hours || 0) * multiplier) : Number(nov.value || 0);
      if (!Number.isFinite(value) || value < 0) throw new Error('Novedad inválida');
      add(nov.category, nov.type, nov.type.replace(/_/g, ' '), value,
        overtime ? `${nov.hours} horas × $${(salary / config.monthlyHours).toFixed(4)} × ${multiplier}` : nov.description,
        nov.category === 'INGRESO' ? 1 : 0, nov.category === 'INGRESO' ? 1 : 0);
    }
    const earned = roundMoney(items.filter(i => i.category === 'INGRESO').reduce((a,i) => a+i.value,0));
    const row = this.calculateRemunerationRow({ monthlySalary: earned, parameters: config });
    add('DESCUENTO', 'IESS_PERSONAL', `Aporte Personal (${row.ratesUsed.personalRate}%)`, row.aportePersonal, `Base: $${earned.toFixed(2)}`);
    add('PATRONAL', 'IESS_PATRONAL', `Aporte patronal configurado (${row.ratesUsed.patronalRate}%)`, row.aportePatronal);
    add('PATRONAL', 'FONDOS_RESERVA', 'Fondos de Reserva', row.fondosReserva);
    for (const [number, amount] of [[13,row.decimo13Mensual],[14,row.decimo14Mensual]]) {
      const monthly = employee[`decimo${number}_mode`] === 'MENSUAL';
      add(monthly ? 'INGRESO' : 'PATRONAL', `DECIMO_${number}`, `${monthly ? 'Pago mensual' : 'Provisión anual'} Décimo ${number}`, amount, 'Exento de IR y aporte IESS');
      if (!monthly && Number(annualBenefits[number] || 0) > 0) {
        add('INGRESO', `PAGO_ANUAL_DECIMO_${number}`, `Pago anual Décimo ${number}`, Number(annualBenefits[number]), 'Liquidación de provisiones registradas, exenta de IR e IESS');
        // Release accumulated liability: paying it again is not a new employer expense.
        add('PATRONAL', `LIBERACION_DECIMO_${number}`, `Aplicación de provisión Décimo ${number}`, -Number(annualBenefits[number]));
      }
    }
    const tax = IncomeTaxService.calculate({ employee, salary, earned, currentIess: row.aportePersonal, period, personalRate: config.personalRate, history: taxHistory });
    add('DESCUENTO', 'IMPUESTO_RENTA', 'Retención de impuesto a la renta', tax.monthlyWithholding,
      `Tabla ${tax.year}; base anual $${tax.annualBase.toFixed(2)}; impuesto causado $${tax.taxBeforeRebate.toFixed(2)}; rebaja $${tax.rebate.toFixed(2)}; impuesto anual $${tax.annualTax.toFixed(2)}; método ${tax.method}; cuotas ${tax.installments}. ${tax.warnings.join(' ')}`);
    const sum = category => roundMoney(items.filter(i => i.category === category).reduce((a,i) => a+i.value,0));
    const totalIncome = sum('INGRESO'), totalDeductions = sum('DESCUENTO');
    const netSalary = roundMoney(totalIncome - totalDeductions);
    const employerContributions = sum('PATRONAL');
    const companyTotalCost = roundMoney(totalIncome + employerContributions);
    const snapshot = {
      calculatedAt: new Date().toISOString(), employeeId: employee.id, employeeCedula: employee.cedula,
      employeeName: `${employee.first_name} ${employee.last_name}`, periodId: period.id, periodName: period.name,
      baseSalary: salary, parametersUsed: config,
      benefits: { decimo13Mode: employee.decimo13_mode || 'ANUAL', decimo14Mode: employee.decimo14_mode || 'ANUAL', annualBenefits },
      tax,
      summary: { totalIncome, totalDeductions, netSalary, costoTotalEmpresa: companyTotalCost }, items
    };
    return { baseSalary: salary, totalIncome, totalDeductions, netSalary, employerContributions, companyTotalCost,
      rumConDecimos: row.rumConDecimos, rumSinDecimos: row.rumSinDecimos, items, snapshotJson: JSON.stringify(snapshot) };
  }
}
module.exports = PayrollCalculationService;
