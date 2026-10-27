import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Calendar,
  FileCheck,
  CheckCircle2,
  ArrowUpRight,
  Search,
  Loader2,
} from "lucide-react";
const labels = {
  BORRADOR: "Borrador",
  ABIERTO: "Abierto",
  CALCULADO: "Calculado",
  CERRADO: "Aprobado",
  PAGADO: "Pagado",
};
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value}T12:00:00`))
    : "Sin fecha";
export default function PeriodsView({ onSelectPeriodForPayroll }) {
  const [periods, setPeriods] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setPeriods(await api.getPeriods());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  if (loading)
    return (
      <div className="loading-panel" role="status">
        <Loader2 className="spin-animation" />
        Cargando períodos…
      </div>
    );
  const visible = periods.filter((p) =>
    `${p.name} ${labels[p.status] || p.status}`
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es")),
  );
  return (
    <div>
      <div className="metric-grid compact-metrics">
        {[
          ["Períodos registrados", periods.length, Calendar],
          [
            "En preparación",
            periods.filter((p) =>
              ["BORRADOR", "ABIERTO", "CALCULADO"].includes(p.status),
            ).length,
            FileCheck,
          ],
          [
            "Períodos pagados",
            periods.filter((p) => p.status === "PAGADO").length,
            CheckCircle2,
          ],
        ].map(([label, value, Icon]) => (
          <div className="metric-card" key={label}>
            <span className="metric-icon">
              <Icon size={19} />
            </span>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div className="feedback error" role="alert">
          {error}
          <button className="btn btn-secondary btn-sm" onClick={load}>
            Reintentar
          </button>
        </div>
      )}
      <section className="surface-panel">
        <div className="panel-toolbar">
          <div>
            <h2>Calendario de nóminas</h2>
            <p>Selecciona un período para revisar o gestionar sus roles.</p>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Buscar período"
              placeholder="Nombre o estado…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Fecha de inicio</th>
                <th>Fecha de fin</th>
                <th>Pago programado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small className="cell-subtitle">Período #{p.id}</small>
                  </td>
                  <td>{date(p.start_date)}</td>
                  <td>{date(p.end_date)}</td>
                  <td>{date(p.payment_date)}</td>
                  <td>
                    <span
                      className={`status-badge status-${p.status.toLowerCase()}`}
                    >
                      {labels[p.status] || p.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectPeriodForPayroll(p.id)}
                    >
                      Gestionar nómina
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan="6">
                    <div className="empty-panel">
                      <Calendar size={28} />
                      <p>No hay períodos que coincidan con tu búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
