import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  DollarSign,
  CreditCard,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  MinusCircle,
  Printer,
} from "lucide-react";

export default function IndividualSlipView({ payrollId, onBack }) {
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSlip = async () => {
    try {
      setLoading(true);
      const data = await api.getPayrollSlip(payrollId);
      setPayroll(data);
    } catch (err) {
      setError(err.message || "Error al cargar rol de pago");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (payrollId) fetchSlip();
  }, [payrollId]);

  if (loading) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        <Loader2 className="spin-animation" size={24} />
        <p>Cargando rol de pago...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#fca5a5",
          padding: "12px",
          borderRadius: "8px",
          margin: "24px",
        }}
      >
        <ShieldAlert size={16} style={{ marginRight: "8px" }} /> {error}
      </div>
    );
  }

  if (!payroll) return null;

  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value || 0));
  const {
    payroll: info,
    earnings = [],
    deductions = [],
    employerItems = [],
    company,
  } = payroll;
  let tax = null;
  try {
    tax = JSON.parse(info.calculation_snapshot_json || "{}").tax || null;
  } catch {
    /* Preserve readable legacy roles. */
  }
  const paymentDate = info.period_payment_date || info.payment_date;
  const formattedDate = paymentDate
    ? new Intl.DateTimeFormat("es-EC", { dateStyle: "long" }).format(
        new Date(`${paymentDate}T12:00:00`),
      )
    : "Sin fecha";
  const sections = [
    {
      title: "Ingresos",
      icon: DollarSign,
      items: earnings,
      total: info.total_income,
      tone: "income",
    },
    {
      title: "Descuentos",
      icon: MinusCircle,
      items: deductions,
      total: info.total_deductions,
      tone: "deductions",
    },
    {
      title: "Aportes y provisiones de la empresa",
      icon: CreditCard,
      items: employerItems,
      total: info.employer_contributions,
      tone: "employer",
    },
  ];

  return (
    <div className="slip-page">
      <div className="slip-toolbar no-print">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Volver a la nómina
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => window.print()}
        >
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>
      <article className="payment-slip">
        <header className="slip-heading">
          <div>
            <p className="slip-company">
              {company?.company_name || "MySubsSmart"}
            </p>
            <h2>Rol individual de pago</h2>
            <p className="slip-subtitle">
              Detalle de remuneraciones en dólares estadounidenses
            </p>
          </div>
          <div className="slip-reference">
            <span>ROL #{String(info.id).padStart(4, "0")}</span>
            <strong>{info.period_name}</strong>
            <span className="slip-status">{info.status}</span>
          </div>
        </header>
        <dl className="slip-details">
          <div>
            <dt>Empleado</dt>
            <dd>{info.employee_name}</dd>
          </div>
          <div>
            <dt>Cédula</dt>
            <dd>{info.employee_cedula}</dd>
          </div>
          <div>
            <dt>Cargo</dt>
            <dd>{info.position_name}</dd>
          </div>
          <div>
            <dt>Fecha de pago</dt>
            <dd>{formattedDate}</dd>
          </div>
        </dl>
        {sections.map(({ title, icon: Icon, items, total, tone }) => (
          <section key={tone} className={`slip-section slip-section-${tone}`}>
            <h3>
              <Icon size={18} /> {title}
            </h3>
            <table className="slip-table">
              <caption className="slip-sr-only">{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Concepto</th>
                  <th scope="col">Valor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id ?? index}>
                    <td>{item.name}</td>
                    <td>{money(item.value)}</td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan="2">Sin conceptos registrados</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total {title.toLowerCase()}</th>
                  <td>{money(total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        ))}
        {tax?.version === 2 ? (
          <details className="slip-tax-explanation no-print">
            <summary>Ver cómo se calculó el impuesto a la renta</summary>
            <dl>
              {[
                ["Ingresos anuales proyectados", tax.annualIncome],
                ["Aporte personal anual", tax.annualIess],
                ["Exoneración", tax.exemption],
                ["Base imponible anual", tax.annualBase],
                ["Impuesto de la tabla", tax.taxBeforeRebate],
                ["Rebaja por gastos personales", tax.rebate],
                ["Impuesto anual", tax.annualTax],
                ["Retenido antes de este período", tax.withheld],
                ["Retención de este rol", tax.monthlyWithholding],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{money(value)}</dd>
                </div>
              ))}
            </dl>
            <p>
              {tax.method === "ENERO_SIN_RETENCION"
                ? "Enero: sin retención de renta."
                : tax.historyComplete
                  ? `Saldo anual pendiente dividido entre ${tax.installments} meses.`
                  : "Cuota ordinaria del impuesto anual dividida entre 11. No hay historial aprobado completo para reliquidar."}
            </p>
            {tax.warnings?.map((w) => (
              <p key={w}>{w}</p>
            ))}
            <p>
              Los décimos no integran la base. Las horas extra del mes se
              incluyen una sola vez en la proyección.
            </p>
            <a href={tax.sources?.regulation} target="_blank" rel="noreferrer">
              SRI: artículo 104 del Reglamento
            </a>
          </details>
        ) : (
          <p className="slip-legacy-tax-note no-print">
            Este rol conserva el cálculo histórico. Los períodos abiertos deben
            recalcularse para aplicar la revisión de renta del artículo 104.
          </p>
        )}
        <div className="slip-net">
          <div>
            <span>Neto a recibir</span>
            <p>Ingresos menos descuentos</p>
          </div>
          <strong>{money(info.net_salary)}</strong>
        </div>
        <div className="slip-company-cost">
          <span>Costo total para la empresa</span>
          <strong>
            {money(
              Number(info.total_income) + Number(info.employer_contributions),
            )}
          </strong>
        </div>
        <footer className="slip-footer">
          {company?.company_name || "MySubsSmart"} &middot; Comprobante de
          remuneraciones del período {info.period_name}.
        </footer>
      </article>
    </div>
  );
}
