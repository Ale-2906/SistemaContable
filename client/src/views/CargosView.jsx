import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Briefcase,
  Plus,
  Pencil,
  Search,
  Network,
  Layers,
  Loader2,
  Info,
} from "lucide-react";
import Modal from "../components/Modal";
const empty = {
  name: "",
  description: "",
  departmentId: "",
  laborRegimeId: "",
  defaultScheduleId: "",
  baseSalary: "",
  parentPositionId: "",
  salaryGrade: "",
  salaryMin: "",
  salaryMax: "",
};
const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
export default function CargosView() {
  const { hasRole } = useAuth(),
    canEdit = hasRole(["ADMIN", "RRHH"]);
  const [positions, setPositions] = useState([]),
    [departments, setDepartments] = useState([]),
    [scales, setScales] = useState([]),
    [regimes, setRegimes] = useState([]),
    [schedules, setSchedules] = useState([]),
    [form, setForm] = useState(null),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [formError, setFormError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState("");
  const load = async () => {
    try {
      const [p, d, r, s, bands] = await Promise.all([
        api.getPositions(),
        api.getDepartments(),
        api.getRegimes(),
        api.getSchedules(),
        api.getSalaryScales(),
      ]);
      setPositions(p);
      setScales(bands);
      setDepartments(d);
      setRegimes(r);
      setSchedules(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const open = (p) => {
    setEditing(p?.id || null);
    setForm(
      p
        ? {
            name: p.name,
            description: p.description || "",
            departmentId: p.department_id,
            laborRegimeId: p.labor_regime_id || "",
            defaultScheduleId: p.default_schedule_id || "",
            baseSalary: p.base_salary,
            parentPositionId: p.parent_position_id || "",
            salaryGrade: p.salary_grade || "",
            salaryMin: p.salary_min ?? p.base_salary,
            salaryMax: p.salary_max ?? p.base_salary,
          }
        : { ...empty },
    );
    setFormError("");
  };
  const change = (e) => {
    const { name, value } = e.target;
    const band =
      name === "salaryGrade" ? scales.find((s) => s.code === value) : null;
    setForm({
      ...form,
      [name]: value,
      ...(band
        ? { salaryMin: band.min_salary, salaryMax: band.max_salary }
        : {}),
    });
  };
  const originalReference = positions.find(
    (p) => p.id === editing,
  )?.base_salary;
  const referenceUnchanged =
    editing && form && Number(form.baseSalary) === Number(originalReference);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      if (editing) await api.updatePosition(editing, form);
      else await api.createPosition(form);
      setForm(null);
      setNotice("Cargo, jerarquía y escala salarial guardados.");
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const visible = positions.filter((p) =>
    `${p.name} ${p.department_name} ${p.salary_grade || ""}`
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es")),
  );
  if (loading)
    return (
      <div className="loading-panel" role="status">
        <Loader2 className="spin-animation" />
        Cargando cargos…
      </div>
    );
  return (
    <div className="positions-page">
      <div className="metric-grid compact-metrics">
        {[
          ["Puestos definidos", positions.length, Briefcase],
          [
            "Con superior asignado",
            positions.filter((p) => p.parent_position_id).length,
            Network,
          ],
          ["Escalas salariales", scales.length, Layers],
        ].map(([label, value, Icon]) => (
          <div className="metric-card" key={label}>
            <span className="metric-icon">
              <Icon size={20} />
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
        </div>
      )}
      {notice && (
        <div className="feedback success" role="status">
          {notice}
        </div>
      )}
      <section className="surface-panel salary-scales-overview">
        <div className="panel-toolbar">
          <div>
            <h2>Escalas salariales internas</h2>
            <p>
              Grados por responsabilidad · USD mensuales · rangos configurables
              de la empresa.
            </p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table salary-scale-catalog">
            <thead>
              <tr>
                <th>Escala</th>
                <th>Nivel</th>
                <th className="numeric">Mínimo</th>
                <th className="numeric">Máximo</th>
                <th className="numeric">Colaboradores</th>
                <th>Revisión</th>
              </tr>
            </thead>
            <tbody>
              {scales.map((band) => (
                <tr key={band.code}>
                  <td>
                    <button
                      className="grade-badge grade-filter-button"
                      title={`Ver cargos de ${band.code}`}
                      onClick={() => setSearch(band.code)}
                    >
                      {band.code}
                    </button>
                  </td>
                  <td>{band.label}</td>
                  <td className="numeric">{money(band.min_salary)}</td>
                  <td className="numeric">{money(band.max_salary)}</td>
                  <td className="numeric">{band.employee_count}</td>
                  <td>
                    {band.out_of_range_count > 0 ? (
                      <span className="status-badge status-pendiente">
                        {band.out_of_range_count} fuera de rango
                      </span>
                    ) : (
                      <span className="text-muted">Sin diferencias</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-caption">
          <span>
            Escala interna de la empresa; no representa una tabla oficial de
            salarios sectoriales.
          </span>
        </div>
      </section>
      <section className="surface-panel">
        <div className="panel-toolbar">
          <div>
            <h2>Catálogo de cargos</h2>
            <p>{visible.length} puestos · valores mensuales en USD</p>
          </div>
          <div className="toolbar-actions">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Buscar cargo"
                placeholder="Cargo, departamento o grado…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => open(null)}>
                <Plus size={16} />
                Nuevo cargo
              </button>
            )}
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cargo / departamento</th>
                <th>Reporta a</th>
                <th>Grado</th>
                <th>Escala salarial</th>
                <th>Sueldo de referencia</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const configured = p.salary_min != null && p.salary_max != null;
                const percent =
                  p.salary_max > p.salary_min
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          ((p.base_salary - p.salary_min) /
                            (p.salary_max - p.salary_min)) *
                            100,
                        ),
                      )
                    : 50;
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small className="cell-subtitle">
                        {p.department_name}
                      </small>
                    </td>
                    <td>
                      {positions.find((q) => q.id === p.parent_position_id)
                        ?.name || (
                        <span className="text-muted">Sin superior</span>
                      )}
                    </td>
                    <td>
                      <span className="grade-badge">
                        {p.salary_grade || "Sin grado"}
                      </span>
                      <small className="cell-subtitle">
                        {p.salary_grade_name}
                      </small>
                    </td>
                    <td>
                      {configured ? (
                        <div className="salary-range">
                          <div>
                            <span>{money(p.salary_min)}</span>
                            <span>{money(p.salary_max)}</span>
                          </div>
                          <div className="salary-track">
                            <i style={{ left: `${percent}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="mode-badge">Por configurar</span>
                      )}
                    </td>
                    <td className="money-cell">
                      {money(p.base_salary)}
                      {configured &&
                        (p.base_salary < p.salary_min ||
                          p.base_salary > p.salary_max) && (
                          <small className="scale-review">
                            Referencia fuera de rango
                          </small>
                        )}
                      {p.out_of_range_count > 0 && (
                        <small className="scale-review">
                          {p.out_of_range_count} colaborador fuera de escala
                        </small>
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          aria-label={`Editar cargo ${p.name}`}
                          onClick={() => open(p)}
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5}>
                    <div className="empty-panel">
                      <Briefcase size={28} />
                      <p>No hay cargos que coincidan con tu búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="panel-caption">
          <Info size={15} />
          <span>
            Los sueldos actuales se conservan. Las diferencias se señalan para
            revisión; los nuevos sueldos se validan contra el rango.
          </span>
        </div>
      </section>
      {form && (
        <Modal
          title={editing ? "Editar cargo" : "Nuevo cargo"}
          description="Define su ubicación en la organización y su escala salarial."
          wide
          busy={busy}
          onClose={() => setForm(null)}
        >
          <form onSubmit={save}>
            {formError && (
              <div className="feedback error" role="alert">
                {formError}
              </div>
            )}
            <div className="section-heading">
              <h3>Identificación del puesto</h3>
            </div>
            <div className="form-grid">
              <label className="field">
                Nombre del cargo *
                <input
                  name="name"
                  value={form.name}
                  onChange={change}
                  required
                />
              </label>
              {[
                ["departmentId", "Departamento", departments],
                [
                  "parentPositionId",
                  "Cargo superior",
                  positions.filter((p) => p.id !== editing),
                ],
                ["laborRegimeId", "Régimen laboral", regimes],
                ["defaultScheduleId", "Jornada", schedules],
              ].map(([name, label, options]) => (
                <label className="field" key={name}>
                  {label}
                  {name === "departmentId" ? " *" : ""}
                  <select
                    name={name}
                    value={form[name]}
                    onChange={change}
                    required={name === "departmentId"}
                  >
                    <option value="">
                      {name === "parentPositionId"
                        ? "Sin superior (puesto raíz)"
                        : "Seleccionar"}
                    </option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="field">
                Descripción
                <input
                  name="description"
                  value={form.description}
                  onChange={change}
                />
              </label>
            </div>
            <div className="section-heading divided">
              <h3>Escala salarial mensual</h3>
              <p>
                Los nuevos sueldos deben quedar dentro del rango. Una referencia
                histórica fuera de rango se conserva y se señala para revisión.
              </p>
            </div>
            <div className="form-grid">
              <label className="field">
                Grado o escala
                <select
                  name="salaryGrade"
                  value={form.salaryGrade}
                  onChange={change}
                >
                  <option value="">Sin escala</option>
                  {scales.map((band) => (
                    <option key={band.code} value={band.code}>
                      {band.code} · {band.label}
                    </option>
                  ))}
                  {form.salaryGrade &&
                    !scales.some((b) => b.code === form.salaryGrade) && (
                      <option value={form.salaryGrade}>
                        {form.salaryGrade} · personalizada
                      </option>
                    )}
                </select>
              </label>
              {[
                ["salaryMin", "Salario mínimo ($)"],
                ["baseSalary", "Sueldo de referencia ($)"],
                ["salaryMax", "Salario máximo ($)"],
              ].map(([name, label]) => (
                <label className="field" key={name}>
                  {label} *
                  <input
                    type="number"
                    min={
                      name === "baseSalary" && !referenceUnchanged
                        ? form.salaryMin || 0
                        : 0
                    }
                    max={
                      name === "baseSalary" && !referenceUnchanged
                        ? form.salaryMax || undefined
                        : undefined
                    }
                    step="0.01"
                    name={name}
                    value={form[name]}
                    onChange={change}
                    required
                  />
                </label>
              ))}
            </div>
            <div className="form-footer">
              <span>* Campos obligatorios</span>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => setForm(null)}
                >
                  Cancelar
                </button>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Guardando…" : "Guardar cargo"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
