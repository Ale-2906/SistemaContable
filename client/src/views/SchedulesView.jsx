import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import { Clock, Plus, Sun, Moon, Loader2 } from "lucide-react";
const empty = {
  name: "",
  startTime: "",
  endTime: "",
  dailyHours: 8,
  scheduleType: "DIURNA",
  description: "",
};
export default function SchedulesView() {
  const { hasRole } = useAuth();
  const [schedules, setSchedules] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [formError, setFormError] = useState(""),
    [notice, setNotice] = useState(""),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      setSchedules(await api.getSchedules());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await api.createSchedule({
        ...form,
        dailyHours: Number(form.dailyHours),
      });
      setForm(null);
      setNotice("Jornada registrada correctamente.");
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  if (loading)
    return (
      <div className="loading-panel" role="status">
        <Loader2 className="spin-animation" />
        Cargando jornadas…
      </div>
    );
  return (
    <div>
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
      <div className="toolbar">
        <div>
          <h2>Jornadas disponibles</h2>
          <p className="text-muted">
            {schedules.length} horarios de trabajo registrados.
          </p>
        </div>
        {hasRole(["ADMIN", "RRHH"]) && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setForm({ ...empty });
              setFormError("");
            }}
          >
            <Plus size={16} />
            Nueva jornada
          </button>
        )}
      </div>
      <div className="schedule-grid">
        {schedules.map((s) => (
          <article className="schedule-card" key={s.id}>
            <div className="schedule-card-heading">
              <span className="feature-icon">
                {s.schedule_type === "NOCTURNA" ? (
                  <Moon size={21} />
                ) : (
                  <Sun size={21} />
                )}
              </span>
              <span className="mode-badge">{s.schedule_type || "DIURNA"}</span>
            </div>
            <h3>{s.name}</h3>
            <div className="schedule-times">
              <div>
                <span>Entrada</span>
                <strong>{s.start_time || "—"}</strong>
              </div>
              <span>→</span>
              <div>
                <span>Salida</span>
                <strong>{s.end_time || "—"}</strong>
              </div>
            </div>
            <div className="schedule-footer">
              <Clock size={14} />
              {s.daily_hours} horas diarias
            </div>
          </article>
        ))}
      </div>
      {!schedules.length && (
        <div className="empty-panel">
          <Clock size={28} />
          <p>Agrega una jornada para asignarla a los colaboradores.</p>
        </div>
      )}
      {form && (
        <Modal
          title="Nueva jornada de trabajo"
          description="Define los horarios y la duración de la jornada."
          onClose={() => setForm(null)}
          busy={busy}
        >
          <form onSubmit={save}>
            {formError && (
              <div className="feedback error" role="alert">
                {formError}
              </div>
            )}
            <label className="field">
              Nombre de la jornada *
              <input name="name" value={form.name} onChange={change} required />
            </label>
            <div className="form-grid" style={{ marginTop: 18 }}>
              {[
                ["startTime", "Hora de entrada"],
                ["endTime", "Hora de salida"],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label} *
                  <input
                    name={key}
                    type="time"
                    value={form[key]}
                    onChange={change}
                    required
                  />
                </label>
              ))}
              <label className="field">
                Horas diarias *
                <input
                  name="dailyHours"
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={form.dailyHours}
                  onChange={change}
                  required
                />
              </label>
              <label className="field">
                Tipo de jornada
                <select
                  name="scheduleType"
                  value={form.scheduleType}
                  onChange={change}
                >
                  <option value="DIURNA">Diurna</option>
                  <option value="NOCTURNA">Nocturna</option>
                  <option value="MIXTA">Mixta</option>
                </select>
              </label>
            </div>
            <div className="form-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setForm(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar jornada"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
