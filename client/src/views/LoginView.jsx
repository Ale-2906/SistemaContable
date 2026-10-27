import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Users,
  Wallet,
  Network,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import Modal from "../components/Modal";
export default function LoginView() {
  const { login, theme, toggleTheme } = useAuth();
  const [email, setEmail] = useState("admin@mysubs.com"),
    [password, setPassword] = useState("admin123"),
    [showPassword, setShowPassword] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reset, setReset] = useState(false),
    [resetEmail, setResetEmail] = useState(""),
    [newPassword, setNewPassword] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const resetPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.resetPassword({ email: resetEmail, newPassword });
      setReset(false);
      setEmail(resetEmail);
      setPassword(newPassword);
      setNotice("Contraseña actualizada. Ingresa con tu nueva credencial.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <aside className="login-story">
        <div className="login-brand">
          <span className="brand-logo-badge">M</span>
          <strong>MySubsSmart</strong>
        </div>
        <div className="login-story-content">
          <span className="eyebrow">PERSONAS. NÓMINA. CONTROL.</span>
          <h1>
            Tu equipo merece
            <br />
            una gestión clara.
          </h1>
          <p>
            Conecta la información de tus colaboradores con cada etapa de la
            nómina.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div className="illustration-orbit" />
            <div className="illustration-card illustration-main">
              <span>
                <Wallet size={20} />
                Gestión de nómina
              </span>
              <div className="illustration-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div>
                <span>Personal</span>
                <span>Períodos</span>
                <span>Pagos</span>
              </div>
            </div>
            <div className="illustration-card illustration-team">
              <Users size={22} />
              <span>Un equipo conectado</span>
              <div className="avatar-stack">
                <i>RH</i>
                <i>AD</i>
                <i>CT</i>
              </div>
            </div>
            <div className="illustration-check">
              <CheckCircle2 size={18} />
              Todo en un mismo lugar
            </div>
          </div>
        </div>
        <span className="login-story-footer">
          MySubsSmart · Gestión salarial para Ecuador
        </span>
      </aside>
      <main className="login-form-side">
        <button
          className="btn btn-secondary btn-icon login-theme"
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="login-form-card">
          <span className="eyebrow">BIENVENIDO A TU ESPACIO</span>
          <h2>Inicia sesión</h2>
          <p>Ingresa tus credenciales para continuar.</p>
          {error && !reset && (
            <div className="feedback error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="feedback success" role="status">
              {notice}
            </div>
          )}
          <form onSubmit={submit}>
            <label className="field">
              Correo o usuario
              <input
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                required
              />
            </label>
            <label className="field">
              Contraseña
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button
              type="button"
              className="text-button forgot-button"
              onClick={() => {
                setReset(true);
                setError("");
              }}
            >
              Restablecer contraseña
            </button>
            <button className="btn btn-primary login-submit" disabled={busy}>
              {busy ? "Validando…" : "Ingresar al sistema"}
              <ArrowRight size={18} />
            </button>
          </form>
          <details className="demo-access">
            <summary>Credenciales de demostración</summary>
            <p>Selecciona un perfil para completar los campos.</p>
            <div>
              {[
                ["Administrador", "admin@mysubs.com", "admin123"],
                ["Recursos humanos", "rrhh@mysubs.com", "rrhh123"],
                ["Consulta", "consulta@mysubs.com", "consulta123"],
              ].map(([label, email, password]) => (
                <button
                  type="button"
                  key={email}
                  onClick={() => {
                    setEmail(email);
                    setPassword(password);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
          <span className="login-footnote">
            Personal · Remuneraciones · Nómina · Reportes
          </span>
        </div>
      </main>
      {reset && (
        <Modal
          title="Restablecer contraseña"
          description="Ingresa tu correo registrado y una nueva contraseña."
          busy={busy}
          onClose={() => setReset(false)}
        >
          <form onSubmit={resetPassword}>
            {error && (
              <div className="feedback error" role="alert">
                {error}
              </div>
            )}
            <label className="field">
              Correo registrado
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Nueva contraseña
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <div className="form-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setReset(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Guardando…" : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
