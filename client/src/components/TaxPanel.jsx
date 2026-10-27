import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Info, ExternalLink, Calculator, Loader2 } from "lucide-react";
import { money } from "./Charts";
const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export default function TaxPanel({ employeeId, form, setForm }) {
  const [month, setMonth] = useState(
      Number(
        new Intl.DateTimeFormat("en-US", {
          month: "numeric",
          timeZone: "America/Guayaquil",
        }).format(new Date()),
      ),
    ),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [expenses, setExpenses] = useState(""),
    [dependents, setDependents] = useState(0),
    [special, setSpecial] = useState(false),
    [galapagos, setGalapagos] = useState(false);
  const valuesKey = JSON.stringify({
    base_salary: form.base_salary || 0,
    hire_date: form.hire_date || "2026-01-01",
    tax_year: form.tax_year || 2026,
    annual_tax_rebate: form.annual_tax_rebate || 0,
    annual_tax_exemption: form.annual_tax_exemption || 0,
  });
  useEffect(() => {
    let active = true;
    setBusy(true);
    const timer = setTimeout(() => {
      api
        .previewIncomeTax({
          employeeId,
          month,
          year: 2026,
          values: JSON.parse(valuesKey),
          expenseEstimate: {
            expenses: Number(expenses || 0),
            dependents: Number(dependents),
            special,
            galapagos,
          },
        })
        .then((data) => {
          if (active) {
            setResult(data);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [employeeId, month, valuesKey, expenses, dependents, special, galapagos]);
  const tax = result?.tax;
  return (
    <div className="tax-panel">
      <div className="section-heading">
        <h3>Impuesto a la renta · ejercicio 2026</h3>
        <p>
          Retención sobre ingresos del trabajo. Los décimos no forman parte de
          esta base.
        </p>
      </div>
      <div className="form-grid tax-input-grid">
        <label className="field">
          Rebaja por gastos personales ($ / año)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.annual_tax_rebate}
            onChange={(e) =>
              setForm({ ...form, annual_tax_rebate: e.target.value })
            }
            aria-describedby="rebate-help"
          />
          <small id="rebate-help">
            Se resta del impuesto causado. Usa la proyección SRI-GP validada; no
            ingreses aquí el total de tus gastos.
          </small>
        </label>
        <label className="field">
          Exoneración de la base imponible ($ / año)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.annual_tax_exemption}
            onChange={(e) =>
              setForm({ ...form, annual_tax_exemption: e.target.value })
            }
            aria-describedby="exemption-help"
          />
          <small id="exemption-help">
            Solo si corresponde por tercera edad o discapacidad, con soporte.
            Ejemplo: tercera edad, una fracción básica de $12.208. Caso general:
            $0.
          </small>
        </label>
      </div>
      <details className="tax-expense-helper">
        <summary>
          <Calculator size={16} />
          Estimar la rebaja con gastos personales
        </summary>
        <div className="form-grid">
          <label className="field">
            Gastos personales proyectados, sin IVA ni ICE ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              placeholder="Ej.: 3000"
            />
          </label>
          <label className="field">
            Cargas familiares válidas
            <select
              value={dependents}
              onChange={(e) => setDependents(e.target.value)}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 5 ? "5 o más" : n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="tax-checkbox">
          <input
            type="checkbox"
            checked={special}
            onChange={(e) => setSpecial(e.target.checked)}
          />
          Discapacidad o enfermedad catastrófica del titular o carga, según
          requisitos
        </label>
        <label className="tax-checkbox">
          <input
            type="checkbox"
            checked={galapagos}
            onChange={(e) => setGalapagos(e.target.checked)}
          />
          Régimen especial de Galápagos, si cumple los requisitos
        </label>
        {result?.expenseEstimate && (
          <div className="rebate-result">
            <span>
              18% de los gastos admitidos, hasta el límite de{" "}
              {money(result.expenseEstimate.ceiling)}
            </span>
            <strong>{money(result.expenseEstimate.rebate)}</strong>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy || !!error}
              onClick={() =>
                setForm({
                  ...form,
                  annual_tax_rebate: result.expenseEstimate.rebate,
                })
              }
            >
              Usar esta rebaja
            </button>
          </div>
        )}
        <small>
          La estimación no sustituye los comprobantes ni la validación del
          formulario SRI-GP. No se registra automáticamente.
        </small>
      </details>
      <section className="tax-preview">
        <div className="tax-preview-heading">
          <h4>Simulación con el sueldo base</h4>
          <label>
            Mes
            <select
              aria-label="Mes de simulación de renta"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {months.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {busy && <Loader2 size={15} className="spin-animation" />}
        </div>
        {error && (
          <p role="alert" className="filter-range-error">
            {error}
          </p>
        )}
        {tax && !error && !busy && (
          <>
            <dl className="tax-breakdown">
              {[
                ["Ingresos anuales proyectados", tax.annualIncome],
                ["Aporte personal anual al IESS", tax.annualIess],
                ["Exoneración de la base", tax.exemption],
                ["Base imponible anual", tax.annualBase],
                ["Impuesto según tabla 2026", tax.taxBeforeRebate],
                ["Rebaja por gastos personales", tax.rebate],
                ["Impuesto anual después de rebaja", tax.annualTax],
                ["Retenciones anteriores registradas", tax.withheld],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{money(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="tax-monthly-result">
              <div>
                <strong>Retención de {months[month - 1].toLowerCase()}</strong>
                <small>
                  {month === 1
                    ? "Enero: sin retención."
                    : tax.historyComplete
                      ? `Saldo pendiente / ${tax.installments} meses restantes.`
                      : "Cuota ordinaria anual / 11; historial incompleto."}
                </small>
              </div>
              <strong>{money(tax.monthlyWithholding)}</strong>
            </div>
            {tax.warnings.map((w) => (
              <p className="tax-history-note" key={w}>
                <Info size={15} />
                {w}
              </p>
            ))}
            <small>
              Vista sin guardar y sin horas extra ni bonos del mes. El rol usa
              las novedades registradas.
            </small>
          </>
        )}
      </section>
      <details className="tax-sources">
        <summary>Cómo se calcula y fuentes oficiales</summary>
        <ol>
          <li>
            Ingresos gravados del año menos aporte personal y exoneraciones:
            base imponible.
          </li>
          <li>
            Aplicar la tabla progresiva; restar la rebaja de gastos personales.
          </li>
          <li>
            Enero no tiene retención. La cuota ordinaria se distribuye de
            febrero a diciembre. Con historial completo se ajusta el saldo por
            retener.
          </li>
        </ol>
        <p>
          Ejemplo de un año completo, sin extras: sueldo de $1.200, aporte
          personal del 9,45%, sin rebaja ni exoneración: base anual $13.039,20;
          impuesto anual $41,56; cuota ordinaria $3,78. Una rebaja válida de
          $41,56 o más lo reduce a $0.
        </p>
        <a
          href="https://www.sri.gob.ec/impuesto-renta"
          target="_blank"
          rel="noreferrer"
        >
          SRI: base imponible y exoneraciones
          <ExternalLink size={12} />
        </a>
        <a
          href="https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar?id=bb7aac3c-251d-4243-9477-10a3ba8e7355&nombre=NAC-DGERCGC25-00000043.pdf"
          target="_blank"
          rel="noreferrer"
        >
          SRI: tabla progresiva 2026
          <ExternalLink size={12} />
        </a>
        <a
          href="https://www.sri.gob.ec/detalle-noticias?idnoticia=1324&marquesina=1"
          target="_blank"
          rel="noreferrer"
        >
          SRI: gastos personales y cargas 2026
          <ExternalLink size={12} />
        </a>
        <a
          href="https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/ee775a90-0ba9-48fe-85cb-9a52673c4c61/REGLAMENTO_PARA_APLICACION_LEY_DE_REGIMEN_TRIBUTARIO_INTERNO_LRTI.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Reglamento, artículo 104: retención mensual
          <ExternalLink size={12} />
        </a>
      </details>
    </div>
  );
}
