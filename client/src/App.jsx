import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";

// Views
import LoginView from "./views/LoginView";
import DashboardView from "./views/DashboardView";
import RemunerationsView from "./views/RemunerationsView";
import ProposalsView from "./views/ProposalsView";
import EmployeesView from "./views/EmployeesView";
import OrgChartView from "./views/OrgChartView";
import CargosView from "./views/CargosView";
import SchedulesView from "./views/SchedulesView";
import PeriodsView from "./views/PeriodsView";
import PayrollView from "./views/PayrollView";
import IndividualSlipView from "./views/IndividualSlipView";
import PaymentsView from "./views/PaymentsView";
import ParametersView from "./views/ParametersView";
import ReportsView from "./views/ReportsView";
import AuditView from "./views/AuditView";

import ChangesGuideView from "./views/ChangesGuideView";
import {
  LayoutDashboard,
  Table,
  Layers,
  Users,
  Briefcase,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  Sliders,
  FileSpreadsheet,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  Search,
  BookOpen,
  ArrowUpRight,
  Network,
} from "lucide-react";

const modules = [
  {
    section: "VISIÓN GENERAL",
    id: "dashboard",
    label: "Resumen general",
    icon: LayoutDashboard,
    description: "Tu equipo, la nómina y los próximos pasos en un solo lugar.",
  },
  {
    section: "PERSONAL",
    id: "employees",
    label: "Colaboradores",
    icon: Users,
    description:
      "Administra datos del equipo, modalidades de décimos y beneficios tributarios.",
  },
  {
    section: "PERSONAL",
    id: "orgchart",
    label: "Organigrama",
    icon: Network,
    description: "Jerarquía de cargos con colaboradores activos.",
  },
  {
    section: "PERSONAL",
    id: "cargos",
    label: "Cargos y escalas",
    icon: Briefcase,
    description: "Define puestos, superiores y rangos de remuneración mensual.",
  },
  {
    section: "PERSONAL",
    id: "schedules",
    label: "Jornadas y horarios",
    icon: Clock,
    description: "Organiza las jornadas de trabajo y los horarios del equipo.",
  },
  {
    section: "NÓMINA Y PAGOS",
    id: "periods",
    label: "Períodos de nómina",
    icon: Calendar,
    description:
      "Prepara cada período y sigue su avance desde borrador hasta el pago.",
  },
  {
    section: "NÓMINA Y PAGOS",
    id: "payroll",
    label: "Nómina mensual",
    icon: FileText,
    description:
      "Revisa décimos, horas extra, impuesto a la renta y el neto de cada colaborador.",
  },
  {
    section: "NÓMINA Y PAGOS",
    id: "payments",
    label: "Pagos",
    icon: DollarSign,
    description:
      "Consulta los lotes de pago y verifica los desembolsos por colaborador.",
  },
  {
    section: "ANÁLISIS",
    id: "remunerations",
    label: "Remuneraciones",
    icon: Table,
    description:
      "Compara sueldos, aportes y beneficios para conocer el costo laboral.",
  },
  {
    section: "ANÁLISIS",
    id: "proposals",
    label: "Propuestas y escenarios",
    icon: Layers,
    description: "Evalúa escenarios salariales y su impacto en el presupuesto.",
  },
  {
    section: "ANÁLISIS",
    id: "reports",
    label: "Reportes",
    icon: FileSpreadsheet,
    description: "Exporta información de personal, remuneraciones y nómina.",
  },
  {
    section: "ADMINISTRACIÓN",
    id: "parameters",
    label: "Parámetros",
    icon: Sliders,
    description:
      "Consulta y actualiza las tasas y bases utilizadas en los cálculos.",
  },
  {
    section: "ADMINISTRACIÓN",
    id: "audit",
    label: "Auditoría",
    icon: ShieldCheck,
    description:
      "Consulta el historial de operaciones y los responsables de cada cambio.",
  },
  {
    section: "AYUDA",
    id: "changes",
    label: "Guía de cambios",
    icon: BookOpen,
    description:
      "Encuentra cada mejora y sigue los pasos para comprobarla en el sistema.",
  },
];
const readView = () => {
  const id = window.location.hash.slice(1);
  return modules.some((m) => m.id === id) ? id : "dashboard";
};

export default function App() {
  const { user, loading, logout, theme, toggleTheme } = useAuth();
  const [currentView, setCurrentView] = useState(readView);
  const [activePayrollSlipId, setActivePayrollSlipId] = useState(null);
  const [selectedPeriodForPayroll, setSelectedPeriodForPayroll] =
    useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  useEffect(() => {
    const onHash = () => {
      setCurrentView(readView());
      setSidebarOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => {
    document.title = `${modules.find((m) => m.id === currentView)?.label || "Rol de pago"} · MySubsSmart`;
  }, [currentView]);
  if (loading)
    return (
      <div className="app-loading" role="status">
        <div className="brand-logo-badge">M</div>
        <p>Preparando tu espacio de trabajo…</p>
      </div>
    );
  if (!user) return <LoginView />;
  const navigateTo = (view, extraId = null) => {
    if (view === "slip") {
      setActivePayrollSlipId(extraId);
      setCurrentView(view);
    } else {
      window.history.pushState(null, "", `#${view}`);
      setCurrentView(view);
    }
    if (view === "payroll" && extraId) setSelectedPeriodForPayroll(extraId);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const activeModule = modules.find((m) => m.id === currentView) || {
    label: "Rol individual de pago",
    section: "NÓMINA Y PAGOS",
    description: "Detalle de ingresos, deducciones y aportes del período.",
  };
  const filtered = modules.filter((m) =>
    m.label.toLocaleLowerCase("es").includes(navSearch.toLocaleLowerCase("es")),
  );
  const groups = [...new Set(filtered.map((m) => m.section))];
  return (
    <div className="app-layout">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Saltar al contenido
      </a>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop no-print"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        id="app-navigation"
        className={`app-sidebar ${sidebarOpen ? "open" : ""} no-print`}
      >
        <div className="sidebar-brand">
          <div className="brand-logo-badge">
            M<span />
          </div>
          <div className="brand-text">
            <span className="brand-title">
              MySubs<span>Smart</span>
            </span>
            <span className="brand-subtitle">PERSONAS & FINANZAS</span>
          </div>
        </div>
        <label className="nav-search">
          <Search size={16} />
          <input
            aria-label="Buscar módulo"
            placeholder="Buscar módulo…"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
          />
        </label>
        <nav className="sidebar-nav" aria-label="Menú principal">
          {groups.map((group) => (
            <div key={group}>
              <div className="nav-section-title">{group}</div>
              {filtered
                .filter((m) => m.section === group)
                .map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      className={`nav-item ${currentView === m.id ? "active" : ""}`}
                      aria-current={currentView === m.id ? "page" : undefined}
                      onClick={() => navigateTo(m.id)}
                    >
                      <Icon size={18} />
                      <span>{m.label}</span>
                      {m.id === "changes" ? (
                        <span className="nav-new">NUEVO</span>
                      ) : (
                        currentView === m.id && <ChevronRight size={14} />
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
          {!filtered.length && (
            <p className="nav-empty">No hay módulos con ese nombre.</p>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="user-avatar">{(user.fullName || "U")[0]}</div>
            <div>
              <strong>{user.fullName || user.username}</strong>
              <span>{user.role}</span>
            </div>
          </div>
          <div className="sidebar-footer-actions">
            <button
              className="btn btn-secondary btn-icon"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"
              }
              title="Cambiar tema"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="btn btn-secondary" onClick={logout}>
              <LogOut size={15} />
              Salir
            </button>
          </div>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="app-main">
        <header className="app-header no-print">
          <div className="header-left">
            <button
              className="btn btn-secondary btn-icon mobile-menu"
              aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
              aria-controls="app-navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div className="breadcrumb">
              <span>Espacio de trabajo</span>
              <ChevronRight size={13} />
              <strong>{activeModule.label}</strong>
            </div>
          </div>
          <div className="header-right">
            <button
              className="btn btn-secondary btn-sm header-help"
              onClick={() => navigateTo("changes")}
            >
              <BookOpen size={15} />
              Ayuda
            </button>
          </div>
        </header>
        <div className="workspace-content" data-view={currentView}>
          <div className="page-intro no-print">
            <div>
              <h1>{activeModule.label}</h1>
            </div>
            {currentView === "dashboard" && (
              <button
                className="btn btn-primary"
                onClick={() => navigateTo("payroll")}
              >
                Ir a nómina
                <ArrowUpRight size={17} />
              </button>
            )}
          </div>
          {currentView === "dashboard" && (
            <DashboardView onNavigate={navigateTo} />
          )}
          {currentView === "employees" && <EmployeesView />}
          {currentView === "orgchart" && <OrgChartView />}
          {currentView === "cargos" && <CargosView />}
          {currentView === "schedules" && <SchedulesView />}
          {currentView === "periods" && (
            <PeriodsView
              onSelectPeriodForPayroll={(id) => navigateTo("payroll", id)}
            />
          )}
          {currentView === "payroll" && (
            <PayrollView
              selectedPeriodId={selectedPeriodForPayroll}
              onSelectPeriod={setSelectedPeriodForPayroll}
              onOpenPeriods={() => navigateTo("periods")}
              onSelectPayrollSlip={(id) => navigateTo("slip", id)}
            />
          )}
          {currentView === "slip" && (
            <IndividualSlipView
              payrollId={activePayrollSlipId}
              onBack={() => navigateTo("payroll", selectedPeriodForPayroll)}
            />
          )}
          {currentView === "payments" && <PaymentsView />}
          {currentView === "remunerations" && <RemunerationsView />}
          {currentView === "proposals" && <ProposalsView />}
          {currentView === "parameters" && <ParametersView />}
          {currentView === "reports" && (
            <ReportsView
              onSelectPeriodForPayroll={(id) => navigateTo("payroll", id)}
            />
          )}
          {currentView === "audit" && <AuditView />}
          {currentView === "changes" && (
            <ChangesGuideView onNavigate={navigateTo} />
          )}
        </div>
      </main>
    </div>
  );
}
