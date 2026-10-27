import React, { useState } from "react";
export const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
const shortMoney = (value) =>
  new Intl.NumberFormat("es-EC", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export function PeriodChart({ rows, mode = "bar" }) {
  const [active, setActive] = useState(null);
  if (!rows.length)
    return <div className="empty-panel">Sin nóminas registradas.</div>;
  const width = 680,
    height = 248,
    left = 56,
    right = 18,
    top = 20,
    bottom = 45,
    plotHeight = height - top - bottom;
  const series = [
    { key: "total_cost", label: "Costo", color: "#2389e8" },
    { key: "net_payout", label: "Neto", color: "#23b8c4" },
  ];
  const rawMax = Math.max(
    1,
    ...rows.flatMap((r) => series.map((s) => Number(r[s.key] || 0))),
  );
  const magnitude = 10 ** Math.floor(Math.log10(rawMax)),
    step = magnitude / 2;
  const max = Math.ceil(rawMax / step) * step;
  const y = (value) =>
    top + plotHeight - (Number(value || 0) / max) * plotHeight;
  const slot = (width - left - right) / rows.length;
  const x = (index) => left + slot * (index + 0.5);
  const selected = active === null ? null : rows[active];
  return (
    <div className="period-chart">
      <div className="plot-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="axis-unit">USD</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Costo laboral y neto por período"
        className="financial-plot"
      >
        {[0, 1, 2, 3, 4].map((t) => {
          const value = (max * t) / 4;
          return (
            <g key={t}>
              <line
                className="plot-grid"
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
              />
              <text
                className="plot-tick"
                x={left - 10}
                y={y(value) + 4}
                textAnchor="end"
              >
                {shortMoney(value)}
              </text>
            </g>
          );
        })}
        {mode === "line" &&
          series.map((s) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              points={rows.map((r, i) => `${x(i)},${y(r[s.key])}`).join(" ")}
            />
          ))}
        {rows.map((row, index) => {
          const title = `${row.name}: costo ${money(row.total_cost)}, neto ${money(row.net_payout)}`;
          const barWidth = Math.min(29, slot * 0.25);
          return (
            <g
              key={row.id}
              tabIndex={0}
              role="img"
              aria-label={title}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <title>{title}</title>
              {series.map((s, i) =>
                mode === "bar" ? (
                  <rect
                    key={s.key}
                    x={x(index) + (i === 0 ? -barWidth - 2 : 2)}
                    y={y(row[s.key])}
                    width={barWidth}
                    height={Math.max(0, top + plotHeight - y(row[s.key]))}
                    rx="3"
                    fill={s.color}
                    opacity={active === null || active === index ? 1 : 0.4}
                  />
                ) : (
                  <circle
                    key={s.key}
                    cx={x(index)}
                    cy={y(row[s.key])}
                    r="4"
                    stroke="var(--bg-card-solid)"
                    strokeWidth="2"
                    fill={s.color}
                  />
                ),
              )}
              <text
                className="plot-tick"
                x={x(index)}
                y={height - 20}
                textAnchor="middle"
              >
                {row.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-readout" aria-live="polite">
        {selected ? (
          <>
            <strong>{selected.name}</strong>
            <span>Costo {money(selected.total_cost)}</span>
            <span>Neto {money(selected.net_payout)}</span>
          </>
        ) : (
          <span>Selecciona un período para ver sus importes.</span>
        )}
      </div>
    </div>
  );
}
export function DonutChart({ rows, label, format = money }) {
  const total = rows.reduce((sum, r) => sum + Number(r.value || 0), 0);
  let start = 0;
  const gradient = rows
    .map((row) => {
      const end = start + (total ? (Number(row.value) / total) * 100 : 0);
      const segment = `${row.color} ${start}% ${end}%`;
      start = end;
      return segment;
    })
    .join(",");
  return (
    <div className="ring-with-legend">
      <div
        className="data-ring"
        role="img"
        aria-label={`${label}: ${format(total)}. ${rows.map((r) => `${r.label}: ${format(r.value)}`).join(". ")}`}
        style={{
          background: total
            ? `conic-gradient(${gradient})`
            : "var(--border-color)",
        }}
      >
        <div>
          <strong>{format(total)}</strong>
          <span>{label}</span>
        </div>
      </div>
      <ul className="ring-legend">
        {rows.map((row) => (
          <li key={row.label}>
            <i style={{ background: row.color }} />
            <span>{row.label}</span>
            <strong>{format(row.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
