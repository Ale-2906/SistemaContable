import React, { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Eye,
  Clock,
} from "lucide-react";
import OvertimeForm from "../components/OvertimeForm";
import TablePagination from "../components/TablePagination";
import { DonutChart, money } from "../components/Charts";
const labels = {
  GENERADO: "Generado",
  DESACTUALIZADO: "Recalcular",
  PREVISION: "Previsión",
  APROBADO: "Aprobado",
  PAGADO: "Pagado",
};
export default function PayrollView({
  selectedPeriodId,
  onSelectPeriod,
  onSelectPayrollSlip,
  onOpenPeriods,
}) {
  const { hasRole } = useAuth(),
    canEdit = hasRole(["ADMIN", "RRHH"]);
  const [periods, setPeriods] = useState([]),
    [periodsLoading, setPeriodsLoading] = useState(true),
    [payrolls, setPayrolls] = useState([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [overtimeEmployee, setOvertimeEmployee] = useState(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  const requestId = useRef(0);
  useEffect(() => {
    let active = true;
    api
      .getPeriods()
      .then((data) => {
        if (!active) return;
        setPeriods(data);
        if (!data.some((p) => String(p.id) === String(selectedPeriodId)))
          onSelectPeriod(data[0]?.id ?? null);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setPeriodsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onSelectPeriod]);
  const fetchPayrolls = async () => {
    if (!selectedPeriodId) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.getPayrolls({ periodId: selectedPeriodId });
      if (id === requestId.current) setPayrolls(data.items);
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };
  useEffect(() => {
    setPage(1);
    setNotice("");
    fetchPayrolls();
    return () => {
      requestId.current++;
    };
  }, [selectedPeriodId]);
  const action = async (fn) => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await fn(selectedPeriodId);
      setNotice(result.message);
      await fetchPayrolls();
      setPeriods(await api.getPeriods());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const period = periods.find((p) => String(p.id) === String(selectedPeriodId)),
    closed = ["CERRADO", "PAGADO"].includes(period?.status);
  const filtered = payrolls.filter(
    (p) =>
      (!status || p.status === status) &&
      `${p.employee_name} ${p.position_name}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  const currentPage = Math.min(
      page,
      Math.max(1, Math.ceil(filtered.length / 10)),
    ),
    visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const sum = (key) => payrolls.reduce((s, p) => s + Number(p[key] || 0), 0);
  const roleRows = [
    {
      label: "Generados",
      value: payrolls.filter((p) => p.status === "GENERADO").length,
      color: "#2389e8",
    },
    {
      label: "Por revisar",
      value: payrolls.filter((p) =>
        ["PREVISION", "DESACTUALIZADO"].includes(p.status),
      ).length,
      color: "#f5b749",
    },
    {
      label: "Aprobados / pagados",
      value: payrolls.filter((p) => ["APROBADO", "PAGADO"].includes(p.status))
        .length,
      color: "#25b8c4",
    },
  ];
  if (periodsLoading)
    return (
      <div className="loading-panel" role="status">
        <Loader2 className="spin-animation" />
        Cargando períodos…
      </div>
    );
  return (
    <div className="payroll-page">
      <div className="payroll-toolbar">
        <label className="period-selector">
          Período
          <select
            id="payroll-period"
            value={selectedPeriodId ?? ""}
            disabled={busy || !periods.length}
            onChange={(e) => onSelectPeriod(Number(e.target.value))}
          >
            {!periods.length && <option value="">Sin períodos</option>}
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.status}
              </option>
            ))}
          </select>
        </label>
        {selectedPeriodId && canEdit && (
          <div className="toolbar-actions">
            <button
              className="btn btn-secondary"
              disabled={
                busy ||
                loading ||
                closed ||
                payrolls.some(
                  (p) =>
                    !p.is_projection &&
                    !["GENERADO", "DESACTUALIZADO"].includes(p.status),
                )
              }
              onClick={() => action(api.generatePayroll)}
            >
              <RefreshCw size={15} />
              {busy ? "Procesando…" : "Recalcular nómina"}
            </button>
            <button
              className="btn btn-primary"
              disabled={
                busy ||
                loading ||
                closed ||
                !payrolls.length ||
                payrolls.some((p) => p.is_projection || p.status !== "GENERADO")
              }
              onClick={() => action(api.approvePayroll)}
            >
              <CheckCircle2 size={15} />
              Aprobar y crear lote
            </button>
          </div>
        )}
      </div>
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="feedback success" role="status">
          {notice}
        </div>
      )}
      {!periods.length && (
        <div className="empty-panel">
          <p>No hay períodos registrados.</p>
          <button className="btn btn-secondary" onClick={onOpenPeriods}>
            Ver períodos
          </button>
        </div>
      )}
      {selectedPeriodId && (
        <>
          <div className="payroll-visual-summary">
            <section className="surface-panel role-ring-panel">
              <DonutChart
                rows={roleRows}
                label="Roles"
                format={(n) => String(n)}
              />
            </section>
            <section className="surface-panel payroll-amounts">
              <div className="payroll-main-totals">
                <div>
                  <span>Neto a pagar</span>
                  <strong>{money(sum("net_salary"))}</strong>
                </div>
                <div>
                  <span>Costo empresarial</span>
                  <strong>
                    {money(sum("total_income") + sum("employer_contributions"))}
                  </strong>
                </div>
              </div>
              <div className="payroll-small-totals">
                {[
                  ["Horas extra", "overtime_amount"],
                  ["Impuesto a la renta", "income_tax"],
                  ["Décimos pagados", "decimos_paid"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>{money(sum(key))}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
          {payrolls.some((p) => p.is_projection) && (
            <div className="compact-notice">
              Las previsiones deben calcularse antes de aprobar.
            </div>
          )}
          <section className="surface-panel payroll-table-panel">
            <div className="panel-toolbar">
              <label className="search-field">
                <Search size={16} />
                <input
                  aria-label="Buscar en nómina"
                  placeholder="Buscar colaborador o cargo…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <div className="toolbar-actions">
                <select
                  aria-label="Filtrar roles por estado"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(labels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="table-unit">USD</span>
              </div>
            </div>
            {loading ? (
              <div className="loading-panel" role="status">
                <Loader2 className="spin-animation" />
                Cargando nómina…
              </div>
            ) : (
              <>
                <div className="table-responsive table-scroll">
                  <table className="data-table payroll-data-table">
                    <thead>
                      <tr>
                        <th>Colaborador / cargo</th>
                        <th className="numeric">Sueldo</th>
                        <th className="numeric">H. extra</th>
                        <th className="numeric">Renta</th>
                        <th className="numeric">Décimos</th>
                        <th className="numeric">Neto a pagar</th>
                        <th>Estado</th>
                        <th className="actions-heading">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.employee_name}</strong>
                            <small className="cell-subtitle">
                              {p.position_name}
                            </small>
                          </td>
                          <td className="numeric">
                            {money(p.base_salary_snapshot)}
                          </td>
                          {[
                            p.overtime_amount,
                            p.income_tax,
                            p.decimos_paid,
                          ].map((value, i) => (
                            <td className="numeric" key={i}>
                              {Number(value) ? (
                                money(value)
                              ) : (
                                <span
                                  className="zero-amount"
                                  title="Sin importe"
                                >
                                  —
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="numeric net-amount">
                            {money(p.net_salary)}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${p.status === "DESACTUALIZADO" ? "status-pendiente" : p.status === "PREVISION" ? "status-borrador" : `status-${p.status.toLowerCase()}`}`}
                            >
                              {labels[p.status] || p.status}
                            </span>
                          </td>
                          <td>
                            <div className="row-actions">
                              {canEdit && !closed && (
                                <button
                                  className="btn btn-secondary btn-icon btn-sm"
                                  disabled={busy}
                                  aria-label={`Horas extra de ${p.employee_name}`}
                                  title="Horas extra"
                                  onClick={() => setOvertimeEmployee(p)}
                                >
                                  <Clock size={15} />
                                </button>
                              )}
                              {!p.is_projection && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => onSelectPayrollSlip(p.id)}
                                  title="Ver rol"
                                >
                                  <Eye size={15} />
                                  Ver rol
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!visible.length && (
                        <tr>
                          <td colSpan="8">
                            <div className="empty-panel">
                              Sin roles para mostrar.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Total del período</td>
                        <td className="numeric">
                          {money(sum("base_salary_snapshot"))}
                        </td>
                        <td className="numeric">
                          {money(sum("overtime_amount"))}
                        </td>
                        <td className="numeric">{money(sum("income_tax"))}</td>
                        <td className="numeric">
                          {money(sum("decimos_paid"))}
                        </td>
                        <td className="numeric">{money(sum("net_salary"))}</td>
                        <td colSpan="2">{payrolls.length} colaboradores</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <TablePagination
                  total={filtered.length}
                  page={currentPage}
                  onChange={setPage}
                />
              </>
            )}
          </section>
        </>
      )}
      {overtimeEmployee && (
        <OvertimeForm
          periodId={selectedPeriodId}
          employee={overtimeEmployee}
          onClose={() => setOvertimeEmployee(null)}
          onSaved={async (message) => {
            setNotice(message);
            await fetchPayrolls();
          }}
        />
      )}
    </div>
  );
}
