import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Clock, Info } from "lucide-react";
import Modal from "./Modal";
export default function OvertimeForm({ periodId, employee, onClose, onSaved }) {
  const [enabled, setEnabled] = useState(false),
    [hours50, setHours50] = useState(0),
    [hours100, setHours100] = useState(0),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [monthlyHours, setMonthlyHours] = useState(240),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      api.getOvertime(periodId, employee.employee_id),
      api.getParameters(),
    ])
      .then(([rows, parameters]) => {
        if (!active) return;
        setHours50(
          rows
            .filter((r) => r.type === "HORAS_EXTRA_50")
            .reduce((s, r) => s + Number(r.hours), 0),
        );
        setHours100(
          rows
            .filter((r) => r.type === "HORAS_EXTRA_100")
            .reduce((s, r) => s + Number(r.hours), 0),
        );
        setEnabled(rows.length > 0);
        setMonthlyHours(
          Number(
            parameters.find((p) => p.code === "MONTHLY_HOURS")?.value || 240,
          ),
        );
        setLoaded(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [periodId, employee.employee_id]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.saveOvertime({
        periodId,
        employeeId: employee.employee_id,
        hours50: enabled ? hours50 : 0,
        hours100: enabled ? hours100 : 0,
      });
      await onSaved(r.message);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const hourly = Number(employee.base_salary_snapshot || 0) / monthlyHours;
  const extra = enabled
    ? Math.round(hourly * Number(hours50) * 1.5 * 100) / 100 +
      Math.round(hourly * Number(hours100) * 2 * 100) / 100
    : 0;
  return (
    <Modal
      title="Horas extra del período"
      description={employee.employee_name}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={save}>
        {error && (
          <div className="feedback error" role="alert">
            {error}
          </div>
        )}
        <label className={`overtime-switch ${enabled ? "enabled" : ""}`}>
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy || !loaded}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>
            <strong>Realizó horas extra</strong>
            <small>Activa esta opción solo si trabajó horas adicionales.</small>
          </span>
          <Clock size={20} />
        </label>
        {enabled && (
          <div className="form-grid overtime-hours">
            {[
              [hours50, setHours50, "Horas con recargo del 50%"],
              [hours100, setHours100, "Horas con recargo del 100%"],
            ].map(([value, set, label]) => (
              <label className="field" key={label}>
                {label}
                <input
                  type="number"
                  min="0"
                  max="240"
                  step="0.25"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
            ))}
          </div>
        )}
        <div className="overtime-total">
          <div>
            <span>Ingreso adicional estimado</span>
            <small>
              {enabled
                ? "Sueldo / horas base × horas trabajadas × recargo"
                : "Sin horas extra en este período"}
            </small>
          </div>
          <strong>
            {extra.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </strong>
        </div>
        <div className="info-callout">
          <Info size={18} />
          <p>
            Al guardar debes recalcular la nómina antes de aprobarla. Desactivar
            la opción elimina las horas extra registradas en este período.
          </p>
        </div>
        <div className="form-footer">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy || !loaded}>
            {busy ? "Cargando…" : "Guardar horas extra"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
