import React from "react";
import {
  Network,
  Gift,
  Clock,
  Receipt,
  Briefcase,
  ArrowUpRight,
  Check,
  Palette,
  Info,
  ChevronRight,
} from "lucide-react";
export const changes = [
  {
    id: "01",
    title: "Jerarquía de puestos",
    icon: Network,
    view: "orgchart",
    route: "Personal → Organigrama",
    before: "La jerarquía se deducía por los nombres de los cargos.",
    after:
      "Solo se muestran puestos con colaboradores activos; los cargos vacantes se omiten conservando la jerarquía.",
    steps: [
      "Abre Organigrama para recorrer los niveles.",
      "En Cargos y escalas, edita un puesto y selecciona su cargo superior.",
      "Regresa al organigrama para comprobar la relación.",
    ],
    files: "OrgChartView.jsx · CargosView.jsx · departments.js · init.js",
  },
  {
    id: "02",
    title: "Décimos mensuales o anuales",
    icon: Gift,
    view: "employees",
    route: "Personal → Colaboradores → Editar → Décimos",
    before: "Los décimos aparecían únicamente como provisiones.",
    after:
      "El tercero y el cuarto pueden pagarse mensualmente o acumularse por empleado.",
    steps: [
      "Pulsa Editar en un colaborador y abre Décimos.",
      "Selecciona la modalidad de cada décimo y la región del cuarto.",
      "Guarda y recalcula un período abierto en Nómina mensual.",
    ],
    files: "EmployeesView.jsx · employees.js · PayrollCalculationService.js",
  },
  {
    id: "03",
    title: "Horas extra opcionales",
    icon: Clock,
    view: "payroll",
    route: "Nómina y pagos → Nómina mensual → Horas extra",
    before: "No había un formulario para registrar las horas del período.",
    after:
      "Una casilla permite registrar o quitar horas con recargos de 50% y 100%.",
    steps: [
      "Selecciona un período abierto y pulsa Horas extra en la fila.",
      "Activa la casilla e ingresa las horas trabajadas.",
      "Guarda, recalcula y revisa la columna Horas extra y el rol.",
    ],
    files: "OvertimeForm.jsx · PayrollView.jsx · payrolls.js",
  },
  {
    id: "04",
    title: "Impuesto a la renta",
    icon: Receipt,
    view: "employees",
    route: "Colaboradores → Editar → Impuesto a la renta",
    before: "El rol no desglosaba la retención de renta.",
    after:
      "La nómina aplica la tabla 2026 y el calendario del SRI; permite simular y revisar el desglose.",
    steps: [
      "En el colaborador, abre la pestaña Impuesto a la renta.",
      "Revisa la rebaja y exoneración anual aprobadas.",
      "Recalcula una nómina abierta y consulta la deducción en Ver rol.",
    ],
    files: "EmployeesView.jsx · PayrollView.jsx · PayrollCalculationService.js",
  },
  {
    id: "05",
    title: "Escalas salariales",
    icon: Briefcase,
    view: "cargos",
    route: "Personal → Cargos y escalas → Editar",
    before: "Solo se registraba el sueldo base del cargo.",
    after:
      "Cada puesto admite grado, salario mínimo y máximo, con validación del rango.",
    steps: [
      "Abre un cargo o crea uno nuevo.",
      "Define el grado, el mínimo, el sueldo base y el máximo.",
      "Los nuevos sueldos se validan contra ese rango.",
    ],
    files:
      "CargosView.jsx · departments.js · salaryScale.js · remunerations.js",
  },
  {
    id: "06",
    title: "Interfaz de todo el sistema",
    icon: Palette,
    view: "dashboard",
    route: "Todos los módulos",
    before:
      "Había estilos distintos, formularios largos y navegación móvil limitada.",
    after:
      "Navegación por áreas, búsqueda de módulos, temas coherentes, formularios por secciones y tablas legibles.",
    steps: [
      "Usa el buscador del menú para encontrar un módulo.",
      "Cambia de tema con el botón de sol o luna.",
      "En móvil, abre el menú desde la cabecera.",
    ],
    files:
      "App.jsx · workspace.css · DashboardView.jsx · LoginView.jsx · componentes compartidos",
  },
];
export default function ChangesGuideView({ onNavigate }) {
  return (
    <div className="guide-page">
      <div className="guide-summary">
        <div className="guide-summary-icon">
          <Check size={25} />
        </div>
        <div>
          <span className="eyebrow">RECORRIDO DE LAS MEJORAS</span>
          <h2>Todo lo que cambió, y dónde encontrarlo</h2>
          <p>
            Abre cada módulo y sigue los pasos. Consultar esta guía no modifica
            datos ni genera pagos.
          </p>
        </div>
        <span className="guide-count">6 mejoras</span>
      </div>
      <div className="guide-grid">
        {changes.map((c) => {
          const Icon = c.icon;
          return (
            <article className="guide-card" key={c.id}>
              <div className="guide-card-top">
                <span className="feature-icon">
                  <Icon size={23} />
                </span>
                <span className="guide-number">{c.id}</span>
              </div>
              <h2>{c.title}</h2>
              <p className="guide-route">{c.route}</p>
              <div className="change-comparison">
                <div>
                  <span>ANTES</span>
                  <p>{c.before}</p>
                </div>
                <div>
                  <span>AHORA</span>
                  <p>{c.after}</p>
                </div>
              </div>
              <ol>
                {c.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <button
                className="btn btn-primary"
                onClick={() => onNavigate(c.view)}
              >
                Ver en el sistema
                <ArrowUpRight size={16} />
              </button>
              <details>
                <summary>
                  Archivos modificados
                  <ChevronRight size={14} />
                </summary>
                <p>{c.files}</p>
              </details>
            </article>
          );
        })}
      </div>
      <div className="info-callout">
        <Info size={20} />
        <div>
          <strong>Para comprobar los importes</strong>
          <p>
            Recalcula un período abierto después de cambiar beneficios u horas.
            Los roles cerrados conservan su historial. Renta es una proyección:
            no incluye conciliación anual ni ingresos de otros empleadores. El
            pago anual de décimos usa únicamente provisiones registradas.
          </p>
        </div>
      </div>
    </div>
  );
}
