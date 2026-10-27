import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Users,
  Wallet,
  Building2,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { PeriodChart, DonutChart, money } from "../components/Charts";
export default function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState(null),
    [payments, setPayments] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState("bar"),
    [allPositions, setAllPositions] = useState(false);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, p] = await Promise.all([
        api.getDashboardStats(),
        api.getPayments(),
      ]);
      setStats(s);
      setPayments(p);
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
        <RefreshCw className="spin-animation" />
        Cargando resumen…
      </div>
    );
  if (error)
    return (
      <div className="feedback error" role="alert">
        {error}
        <button className="btn btn-secondary" onClick={load}>
          Reintentar
        </button>
      </div>
    );
  const { kpis: k, charts, lastPeriod } = stats;
  const positions = charts.employeesByPosition
    .filter((p) => Number(p.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count));
  const maxPeople = Math.max(1, ...positions.map((p) => Number(p.count)));
  const paymentRows = [
    {
      label: "Pagados",
      value: payments.filter((p) => p.status === "PAGADO").length,
      color: "#2389e8",
    },
    {
      label: "Pendientes",
      value: payments.filter((p) => p.status === "PENDIENTE").length,
      color: "#f5b749",
    },
  ];
  const distribution = charts.costDistribution.map((d, i) => ({
    label: d.label,
    value: d.amount,
    color: ["#2389e8", "#24bbc4", "#f5b749", "#8886e8"][i],
  }));
  return (
    <div className="dashboard-page analytics-dashboard">
      <div className="dashboard-context">
        <span>
          <Calendar size={15} />
          {lastPeriod?.name || "Sin períodos"}
        </span>
        <button className="text-button" onClick={() => onNavigate("periods")}>
          Ver períodos
          <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="metric-grid">
        {[
          ["Colaboradores", k.activeEmployees, Users],
          ["Sueldos mensuales", money(k.monthlySalaryMass), Wallet],
          ["Costo mensual estimado", money(k.totalMonthlyCost), Building2],
          ["Pendiente de pago", money(k.pendingPayments), Calendar],
        ].map(([label, value, Icon]) => (
          <article className="metric-card" key={label}>
            <div className="metric-card-top">
              <span>{label}</span>
              <span className="metric-icon">
                <Icon size={18} />
              </span>
            </div>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="surface-panel history-panel">
          <div className="panel-toolbar">
            <h2>Costo y neto por período</h2>
            <div
              className="chart-mode"
              role="group"
              aria-label="Tipo de gráfico"
            >
              <button
                aria-label="Gráfico de barras"
                aria-pressed={mode === "bar"}
                onClick={() => setMode("bar")}
              >
                <BarChart3 size={15} />
              </button>
              <button
                aria-label="Gráfico de líneas"
                aria-pressed={mode === "line"}
                onClick={() => setMode("line")}
              >
                <TrendingUp size={15} />
              </button>
            </div>
          </div>
          <PeriodChart rows={charts.monthlyCostHistory} mode={mode} />
        </section>
        <section className="surface-panel payment-ring-panel">
          <div className="panel-toolbar">
            <h2>Lotes de pago</h2>
            <button
              className="text-button"
              onClick={() => onNavigate("payments")}
            >
              Ver pagos
              <ArrowUpRight size={13} />
            </button>
          </div>
          <DonutChart
            rows={paymentRows}
            label="Lotes"
            format={(n) => String(n)}
          />
        </section>
        <section className="surface-panel">
          <div className="panel-toolbar">
            <h2>Personal por cargo</h2>
            {positions.length > 6 && (
              <button
                className="text-button"
                onClick={() => setAllPositions(!allPositions)}
              >
                {allPositions ? "Ver menos" : "Ver todos"}
              </button>
            )}
          </div>
          <div className="staff-bars">
            {(allPositions ? positions : positions.slice(0, 6)).map((p) => (
              <div className="staff-bar-row" key={p.position_name}>
                <div>
                  <span>{p.position_name}</span>
                  <strong>{p.count}</strong>
                </div>
                <div className="staff-bar-track">
                  <i
                    style={{ width: `${(Number(p.count) / maxPeople) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!positions.length && (
              <div className="empty-panel">Sin colaboradores activos.</div>
            )}
          </div>
        </section>
        <section className="surface-panel">
          <div className="panel-toolbar">
            <h2>Composición del costo estimado</h2>
          </div>
          <DonutChart rows={distribution} label="Total mensual" />
        </section>
      </div>
    </div>
  );
}
