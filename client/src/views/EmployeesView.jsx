import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Pencil,
  UserCheck,
  UserX,
  Gift,
  Receipt,
  Briefcase,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import TablePagination from "../components/TablePagination";
import TaxPanel from "../components/TaxPanel";
import { filterEmployees } from "../utils/employeeFilters.mjs";
const empty = {
  cedula: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  hire_date: "",
  department_id: "",
  position_id: "",
  labor_regime_id: "",
  work_schedule_id: "",
  base_salary: "",
  decimo13_mode: "ANUAL",
  decimo14_mode: "ANUAL",
  decimo14_month: 8,
  tax_year: 2026,
  annual_tax_rebate: 0,
  annual_tax_exemption: 0,
};
const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
export default function EmployeesView() {
  const { hasRole } = useAuth(),
    canEdit = hasRole(["ADMIN", "RRHH"]);
  const [employees, setEmployees] = useState([]),
    [references, setReferences] = useState({
      departments: [],
      positions: [],
      regimes: [],
      schedules: [],
    });
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [formError, setFormError] = useState(""),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [form, setForm] = useState(null),
    [editing, setEditing] = useState(null),
    [tab, setTab] = useState("personal");
  const [filters, setFilters] = useState({
    departmentId: "",
    positionId: "",
    decimo13: "",
    decimo14: "",
    salaryMin: "",
    salaryMax: "",
    sort: "name",
  });
  const [advanced, setAdvanced] = useState(false),
    [page, setPage] = useState(1);
  const changeFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "departmentId" ? { positionId: "" } : {}),
    }));
    setPage(1);
  };
  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setFilters({
      departmentId: "",
      positionId: "",
      decimo13: "",
      decimo14: "",
      salaryMin: "",
      salaryMax: "",
      sort: "name",
    });
    setPage(1);
  };
  const load = async () => {
    setError("");
    try {
      const [e, d, p, r, s] = await Promise.all([
        api.getEmployees(),
        api.getDepartments(),
        api.getPositions(),
        api.getRegimes(),
        api.getSchedules(),
      ]);
      setEmployees(e);
      setReferences({ departments: d, positions: p, regimes: r, schedules: s });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const open = (employee) => {
    setEditing(employee?.id || null);
    setForm(
      employee
        ? {
            ...empty,
            ...Object.fromEntries(
              Object.keys(empty).map((key) => [
                key,
                employee[key] ?? empty[key],
              ]),
            ),
          }
        : { ...empty },
    );
    setTab("personal");
    setFormError("");
  };
  const save = async (e) => {
    e.preventDefault();
    const invalid = e.currentTarget.querySelector(":invalid");
    if (invalid) {
      const panel = invalid.closest("[role=tabpanel]");
      if (panel) setTab(panel.id.replace("panel-", ""));
      requestAnimationFrame(() => invalid.reportValidity());
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (editing) await api.updateEmployee(editing, form);
      else await api.createEmployee(form);
      setForm(null);
      setNotice(
        "Colaborador guardado. Si cambiaste beneficios, recalcula la nómina abierta.",
      );
      await load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (employee) => {
    setBusy(true);
    setError("");
    try {
      await api.toggleEmployeeStatus(employee.id);
      await load();
      setNotice("Estado del colaborador actualizado.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const field = (key, label, type = "text", required = false, props = {}) => (
    <label className="field" key={key}>
      {label}
      {required && <span className="required-mark"> *</span>}
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={required}
        {...props}
      />
    </label>
  );
  const select = (key, label, options, required = true) => (
    <label className="field" key={key}>
      {label}
      {required && <span className="required-mark"> *</span>}
      <select
        value={form[key]}
        required={required}
        onChange={(e) => {
          const value = e.target.value;
          if (key === "position_id") {
            const p = references.positions.find((p) => String(p.id) === value);
            setForm({
              ...form,
              position_id: value,
              department_id: p?.department_id ?? form.department_id,
              base_salary: editing ? form.base_salary : (p?.base_salary ?? ""),
              labor_regime_id: p?.labor_regime_id ?? form.labor_regime_id,
              work_schedule_id: p?.default_schedule_id ?? form.work_schedule_id,
            });
          } else
            setForm({
              ...form,
              [key]: value,
              ...(key === "department_id" ? { position_id: "" } : {}),
            });
        }}
      >
        <option value="">Seleccionar</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
  const filtered = filterEmployees(employees, { ...filters, search, status });
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 10)),
  );
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const activeCount = [
    search,
    status,
    ...Object.entries(filters)
      .filter(([key]) => key !== "sort")
      .map(([, value]) => value),
  ].filter((value) => value !== "").length;
  const invalidRange =
    filters.salaryMin !== "" &&
    filters.salaryMax !== "" &&
    Number(filters.salaryMin) > Number(filters.salaryMax);
  const tabs = [
    ["personal", "Datos personales", Users],
    ["laboral", "Puesto y contrato", Briefcase],
    ["decimos", "Décimos", Gift],
    ["renta", "Impuesto a la renta", Receipt],
  ];
  if (loading)
    return (
      <div className="loading-panel" role="status">
        <Loader2 className="spin-animation" />
        Cargando colaboradores…
      </div>
    );
  return (
    <div className="people-page">
      <div className="metric-grid compact-metrics">
        {[
          ["Equipo registrado", employees.length, Users],
          [
            "Personal activo",
            employees.filter((e) => e.status === "ACTIVO").length,
            UserCheck,
          ],
          [
            "Décimo 13 mensual",
            employees.filter((e) => e.decimo13_mode === "MENSUAL").length,
            Gift,
          ],
          [
            "Décimo 14 mensual",
            employees.filter((e) => e.decimo14_mode === "MENSUAL").length,
            Gift,
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
      {notice && (
        <div className="feedback success" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      <section className="surface-panel">
        <div className="panel-toolbar people-directory-heading">
          <div>
            <h2>Directorio de colaboradores</h2>
            <p role="status">
              {filtered.length} de {employees.length} registros
            </p>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => open(null)}>
              <Plus size={16} />
              Nuevo colaborador
            </button>
          )}
        </div>
        <div className="employee-filter-panel">
          <div className="employee-filter-row">
            <label className="search-field employee-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nombre, cédula, correo o cargo…"
                aria-label="Buscar colaborador"
              />
              {search && (
                <button
                  type="button"
                  className="filter-clear-search"
                  aria-label="Borrar búsqueda"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <label className="filter-field">
              Estado
              <select
                aria-label="Filtrar por estado"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </label>
            <label className="filter-field">
              Departamento
              <select
                aria-label="Filtrar por departamento"
                value={filters.departmentId}
                onChange={(e) => changeFilter("departmentId", e.target.value)}
              >
                <option value="">Todos los departamentos</option>
                {references.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`btn ${advanced ? "btn-primary" : "btn-secondary"}`}
              aria-expanded={advanced}
              aria-controls="employee-advanced-filters"
              onClick={() => setAdvanced(!advanced)}
            >
              <SlidersHorizontal size={15} />
              Más filtros
              {activeCount > 0 && (
                <span className="filter-counter">{activeCount}</span>
              )}
            </button>
          </div>
          {advanced && (
            <div
              className="employee-advanced-filters"
              id="employee-advanced-filters"
            >
              <label className="filter-field">
                Cargo
                <select
                  aria-label="Filtrar por cargo"
                  value={filters.positionId}
                  onChange={(e) => changeFilter("positionId", e.target.value)}
                >
                  <option value="">Todos los cargos</option>
                  {references.positions
                    .filter(
                      (p) =>
                        !filters.departmentId ||
                        String(p.department_id) ===
                          String(filters.departmentId),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              {[
                ["decimo13", "Décimo 13"],
                ["decimo14", "Décimo 14"],
              ].map(([key, label]) => (
                <label className="filter-field" key={key}>
                  {label}
                  <select
                    aria-label={`Filtrar ${label.toLowerCase()}`}
                    value={filters[key]}
                    onChange={(e) => changeFilter(key, e.target.value)}
                  >
                    <option value="">Todas las modalidades</option>
                    <option value="MENSUAL">Mensual</option>
                    <option value="ANUAL">Acumulado anual</option>
                  </select>
                </label>
              ))}
              <label className="filter-field">
                Sueldo desde ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Sueldo mínimo del filtro"
                  value={filters.salaryMin}
                  onChange={(e) => changeFilter("salaryMin", e.target.value)}
                  placeholder="Sin mínimo"
                />
              </label>
              <label className="filter-field">
                Sueldo hasta ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Sueldo máximo del filtro"
                  value={filters.salaryMax}
                  onChange={(e) => changeFilter("salaryMax", e.target.value)}
                  placeholder="Sin máximo"
                />
              </label>
            </div>
          )}
          <div className="employee-filter-footer">
            <span>
              {activeCount
                ? `${activeCount} ${activeCount === 1 ? "filtro aplicado" : "filtros aplicados"}`
                : "Sin filtros aplicados"}
              {activeCount > 0 && (
                <button className="text-button" onClick={resetFilters}>
                  Limpiar filtros
                </button>
              )}
            </span>
            <label>
              Ordenar por
              <select
                aria-label="Ordenar colaboradores"
                value={filters.sort}
                onChange={(e) => changeFilter("sort", e.target.value)}
              >
                <option value="name">Nombre A–Z</option>
                <option value="salaryDesc">Mayor sueldo</option>
                <option value="salaryAsc">Menor sueldo</option>
                <option value="recent">Ingreso más reciente</option>
              </select>
            </label>
          </div>
          {invalidRange && (
            <p className="filter-range-error" role="alert">
              El sueldo mínimo no puede superar al máximo.
            </p>
          )}
        </div>
        <div className="table-responsive">
          <table className="data-table people-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Puesto y departamento</th>
                <th>Sueldo mensual</th>
                <th>Escala salarial</th>
                <th>Décimo 13</th>
                <th>Décimo 14</th>
                <th>Estado</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="person-cell">
                      <span className="person-avatar">
                        {e.first_name[0]}
                        {e.last_name[0]}
                      </span>
                      <div>
                        <strong>
                          {e.first_name} {e.last_name}
                        </strong>
                        <small>{e.cedula}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{e.position_name}</strong>
                    <small className="cell-subtitle">{e.department_name}</small>
                  </td>
                  <td className="money-cell">{money(e.base_salary)}</td>
                  <td className="employee-scale-cell">
                    {e.salary_grade ? (
                      <>
                        <span className="grade-badge">{e.salary_grade}</span>
                        <small className="cell-subtitle">
                          {e.salary_grade_name}
                        </small>
                        <small className="cell-subtitle">
                          {money(e.salary_min)} – {money(e.salary_max)}
                        </small>
                        {(e.base_salary < e.salary_min ||
                          e.base_salary > e.salary_max) && (
                          <small className="scale-review">
                            {e.base_salary < e.salary_min
                              ? "Por debajo del mínimo"
                              : "Sobre el máximo"}
                          </small>
                        )}
                      </>
                    ) : (
                      <span className="text-muted">Sin asignar</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`mode-badge ${e.decimo13_mode === "MENSUAL" ? "monthly" : ""}`}
                    >
                      {e.decimo13_mode === "MENSUAL" ? "Mensual" : "Acumulado"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`mode-badge ${e.decimo14_mode === "MENSUAL" ? "monthly" : ""}`}
                    >
                      {e.decimo14_mode === "MENSUAL" ? "Mensual" : "Acumulado"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${e.status === "ACTIVO" ? "status-active" : "status-inactive"}`}
                    >
                      {e.status === "ACTIVO" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          aria-label={`Editar a ${e.first_name} ${e.last_name}`}
                          onClick={() => open(e)}
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          className="btn btn-secondary btn-icon"
                          disabled={busy}
                          title={
                            e.status === "ACTIVO"
                              ? "Desactivar colaborador"
                              : "Activar colaborador"
                          }
                          aria-label={`${e.status === "ACTIVO" ? "Desactivar" : "Activar"} a ${e.first_name}`}
                          onClick={() => toggle(e)}
                        >
                          {e.status === "ACTIVO" ? (
                            <UserX size={15} />
                          ) : (
                            <UserCheck size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={canEdit ? 8 : 7}>
                    <div className="empty-panel">
                      <Users size={30} />
                      <h3>No encontramos colaboradores</h3>
                      <p>Prueba otro nombre o cambia el filtro de estado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          total={filtered.length}
          page={currentPage}
          onChange={setPage}
        />
      </section>
      {form && (
        <Modal
          title={editing ? "Editar colaborador" : "Nuevo colaborador"}
          description="Completa los datos y revisa sus beneficios antes de guardar."
          wide
          busy={busy}
          onClose={() => setForm(null)}
        >
          <form noValidate onSubmit={save}>
            <div
              className="form-tabs"
              role="tablist"
              aria-label="Secciones del colaborador"
              onKeyDown={(e) => {
                const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
                if (!keys.includes(e.key)) return;
                e.preventDefault();
                const index = tabs.findIndex((t) => t[0] === tab),
                  next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? tabs.length - 1
                        : (index +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            tabs.length) %
                          tabs.length;
                setTab(tabs[next][0]);
                document.getElementById(`tab-${tabs[next][0]}`)?.focus();
              }}
            >
              {tabs.map(([id, label, Icon]) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  type="button"
                  role="tab"
                  tabIndex={tab === id ? 0 : -1}
                  aria-selected={tab === id}
                  aria-controls={`panel-${id}`}
                  onClick={() => setTab(id)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            {formError && (
              <div className="feedback error" role="alert">
                {formError}
              </div>
            )}
            <div
              role="tabpanel"
              id="panel-personal"
              aria-labelledby="tab-personal"
              hidden={tab !== "personal"}
            >
              <div className="section-heading">
                <h3>Información personal</h3>
                <p>Identificación y datos de contacto del colaborador.</p>
              </div>
              <div className="form-grid">
                {field("cedula", "Cédula", "text", true)}
                {field("hire_date", "Fecha de ingreso", "date", true)}
                {field("first_name", "Nombres", "text", true)}
                {field("last_name", "Apellidos", "text", true)}
                {field("email", "Correo electrónico", "email", true)}
                {field("phone", "Teléfono", "tel")}
                {field("address", "Dirección")}
              </div>
            </div>
            <div
              role="tabpanel"
              id="panel-laboral"
              aria-labelledby="tab-laboral"
              hidden={tab !== "laboral"}
            >
              <div className="section-heading">
                <h3>Puesto y remuneración</h3>
                <p>El cargo determina la escala salarial disponible.</p>
              </div>
              <div className="form-grid">
                {select(
                  "department_id",
                  "Departamento",
                  references.departments,
                )}
                {select(
                  "position_id",
                  "Cargo",
                  references.positions.filter(
                    (p) =>
                      !form.department_id ||
                      String(p.department_id) === String(form.department_id),
                  ),
                )}
                {select(
                  "labor_regime_id",
                  "Régimen laboral",
                  references.regimes,
                  false,
                )}
                {select(
                  "work_schedule_id",
                  "Jornada",
                  references.schedules,
                  false,
                )}
                {field("base_salary", "Sueldo mensual ($)", "number", true, {
                  min: 0,
                  step: "0.01",
                  disabled: !!editing,
                })}
              </div>
              {editing && (
                <div className="info-callout">
                  <Briefcase size={18} />
                  <p>
                    Para cambiar el sueldo y conservar su historial, usa el
                    módulo Remuneraciones.
                  </p>
                </div>
              )}
            </div>
            <div
              role="tabpanel"
              id="panel-decimos"
              aria-labelledby="tab-decimos"
              hidden={tab !== "decimos"}
            >
              <div className="section-heading">
                <h3>¿Cómo recibe sus décimos?</h3>
                <p>
                  La modalidad se configura por separado para cada beneficio.
                </p>
              </div>
              <div className="benefit-grid">
                {[13, 14].map((n) => (
                  <fieldset className="benefit-choice" key={n}>
                    <legend>
                      <Gift size={19} />
                      Décimo {n === 13 ? "tercero" : "cuarto"}
                    </legend>
                    {[
                      ["MENSUAL", "Mensual", "Se suma al neto de cada nómina."],
                      [
                        "ANUAL",
                        "Acumulado anual",
                        "Se provisiona y paga en el período correspondiente.",
                      ],
                    ].map(([value, label, description]) => (
                      <label
                        className={`radio-card ${form[`decimo${n}_mode`] === value ? "selected" : ""}`}
                        key={value}
                      >
                        <input
                          type="radio"
                          name={`decimo${n}`}
                          value={value}
                          checked={form[`decimo${n}_mode`] === value}
                          onChange={() =>
                            setForm({ ...form, [`decimo${n}_mode`]: value })
                          }
                        />
                        <span>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <label className="field">
                Región para el pago anual del décimo cuarto
                <select
                  value={form.decimo14_month}
                  onChange={(e) =>
                    setForm({ ...form, decimo14_month: Number(e.target.value) })
                  }
                >
                  <option value={8}>Sierra / Amazonía · agosto</option>
                  <option value={3}>Costa / Insular · marzo</option>
                </select>
              </label>
              <div className="info-callout">
                <Gift size={18} />
                <p>
                  El pago anual liquida las provisiones registradas. Guarda los
                  cambios y recalcula la nómina abierta.
                </p>
              </div>
            </div>
            <div
              role="tabpanel"
              id="panel-renta"
              aria-labelledby="tab-renta"
              hidden={tab !== "renta"}
            >
              {tab === "renta" && (
                <TaxPanel employeeId={editing} form={form} setForm={setForm} />
              )}
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
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !form.cedula ||
                      !form.first_name ||
                      !form.last_name ||
                      !form.hire_date ||
                      !form.email
                    )
                      setTab("personal");
                    else if (
                      !form.position_id ||
                      !form.department_id ||
                      form.base_salary === ""
                    )
                      setTab("laboral");
                  }}
                >
                  {busy ? "Guardando…" : "Guardar colaborador"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
