import React, { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { occupiedHierarchy } from "../utils/organization.mjs";
import {
  Network,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Briefcase,
  Loader2,
} from "lucide-react";
export default function OrgChartView() {
  const [positions, setPositions] = useState([]),
    [employees, setEmployees] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [collapsed, setCollapsed] = useState(new Set());
  useEffect(() => {
    let active = true;
    Promise.all([api.getPositions(), api.getEmployees({ status: "ACTIVO" })])
      .then(([p, e]) => {
        if (active) {
          setPositions(occupiedHierarchy(p, e));
          setEmployees(e);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const viewport = useRef(null);
  useEffect(() => {
    if (!loading && viewport.current)
      viewport.current.scrollLeft =
        (viewport.current.scrollWidth - viewport.current.clientWidth) / 2;
  }, [loading]);
  const roots = positions.filter(
    (p) =>
      !p.parent_position_id ||
      !positions.some((q) => q.id === p.parent_position_id),
  );
  const peopleFor = (p) => employees.filter((e) => e.position_id === p.id);
  const childrenFor = (p) =>
    positions.filter((q) => q.parent_position_id === p.id);
  const matches = (p, path = new Set()) => {
    if (path.has(p.id)) return false;
    const next = new Set([...path, p.id]);
    return (
      `${p.name} ${p.department_name} ${peopleFor(p)
        .map((e) => `${e.first_name} ${e.last_name}`)
        .join(" ")}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) ||
      childrenFor(p).some((c) => matches(c, next))
    );
  };
  const toggle = (id) =>
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const node = (p, depth = 0, path = new Set()) => {
    if (path.has(p.id) || (search && !matches(p))) return null;
    const next = new Set([...path, p.id]),
      children = childrenFor(p),
      people = peopleFor(p),
      closed = !search && collapsed.has(p.id);
    return (
      <li
        className={`position-node org-level-${Math.min(depth, 2)}`}
        key={p.id}
      >
        <article
          data-position-id={p.id}
          className={`position-card ${depth === 0 ? "position-root" : ""}`}
        >
          <div className="position-card-top">
            <span className="position-symbol">
              {depth === 0 ? <Network size={20} /> : <Briefcase size={18} />}
            </span>
            <span className="position-department">{p.department_name}</span>
            {p.salary_grade && (
              <span className="grade-badge">{p.salary_grade}</span>
            )}
          </div>
          <span className="position-hierarchy-level">Nivel {depth + 1}</span>
          <h3>{p.name}</h3>
          <div className="position-people">
            {people.length
              ? people.map((e) => (
                  <div key={e.id}>
                    <span className="person-avatar">
                      {e.first_name[0]}
                      {e.last_name[0]}
                    </span>
                    <span>
                      {e.first_name} {e.last_name}
                    </span>
                  </div>
                ))
              : null}
          </div>
          {children.length > 0 && (
            <button
              className="position-toggle"
              disabled={!!search}
              aria-label={`${closed ? "Expandir" : "Contraer"} puestos de ${p.name}`}
              aria-expanded={!closed}
              onClick={() => toggle(p.id)}
            >
              <span>{children.length} puestos a cargo</span>
              {closed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </article>
        {!closed && children.length > 0 && (
          <ul
            className="position-children"
            aria-label={`Puestos bajo ${p.name}`}
          >
            {children.map((c) => node(c, depth + 1, next))}
          </ul>
        )}
      </li>
    );
  };
  return (
    <div className="organization-page">
      <section className="surface-panel">
        <div className="panel-toolbar">
          <div>
            <h2>Estructura jerárquica</h2>
            <p>
              {positions.length} puestos · {employees.length} colaboradores
              activos
            </p>
          </div>
          <div className="toolbar-actions">
            <label className="search-field">
              <Search size={16} />
              <input
                placeholder="Buscar puesto o persona…"
                aria-label="Buscar en el organigrama"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCollapsed(new Set())}
            >
              <Maximize2 size={15} />
              Expandir
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCollapsed(new Set(positions.map((p) => p.id)))}
            >
              <Minimize2 size={15} />
              Contraer
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loading-panel" role="status">
            <Loader2 className="spin-animation" />
            Cargando estructura…
          </div>
        ) : error ? (
          <div className="feedback error" role="alert">
            {error}
          </div>
        ) : (
          <div
            className="organization-viewport"
            ref={viewport}
            tabIndex={0}
            role="region"
            aria-label="Organigrama con desplazamiento horizontal"
          >
            <ul className="position-tree">
              {roots.filter((p) => !search || matches(p)).map((p) => node(p))}
            </ul>
            {(!positions.length || !roots.some((p) => matches(p))) && (
              <div className="empty-panel">
                <Network size={30} />
                <p>
                  {positions.length
                    ? "No hay coincidencias para esta búsqueda."
                    : "No hay colaboradores activos asignados a cargos."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
