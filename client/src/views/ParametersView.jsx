import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Sliders, Edit2, History, CheckCircle2, AlertCircle,
  Calendar, ShieldCheck, DollarSign, Percent
} from 'lucide-react';

export default function ParametersView() {
  const { hasRole } = useAuth();
  const [parameters, setParameters] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeParam, setActiveParam] = useState(null);
  const [formValue, setFormValue] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, hList] = await Promise.all([
        api.getParameters(),
        api.getParameterHistory()
      ]);
      setParameters(pList);
      setHistory(hList);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (param) => {
    setActiveParam(param);
    setFormValue(param.value);
    setFormReason('');
    setFormEffectiveDate(new Date().toISOString().split('T')[0]);
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!activeParam) return;

    try {
      const res = await api.updateParameter(activeParam.code, {
        value: Number(formValue),
        reason: formReason,
        effectiveStartDate: formEffectiveDate
      });
      showToast(res.message);
      setShowEditModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Toast */}
      {notification && (
        <div className="toast-container">
          <div className={`toast toast-${notification.type}`}>
            {notification.type === 'success' ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Configuración de Parámetros de Nómina</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Administración dinámica de tasas legales (Ecuador), aportes IESS, fondos de reserva y salario básico
          </p>
        </div>
      </div>

      {/* Legal Compliance Notice */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px',
        color: 'var(--success-text)'
      }}>
        <ShieldCheck size={20} />
        <div>
          <strong>Cambios con historial:</strong> Las tasas y bases configuradas se utilizan al recalcular la nómina. Cada modificación conserva su valor anterior, fecha y motivo en el historial.
        </div>
      </div>

      {parameters.some(p=>p.code==='DECIMO_14_BASE' && Number(p.value)!==482) && <div className="info-callout parameter-review" role="status"><div><strong>Revisar base del décimo cuarto para 2026.</strong><p>El SBU oficial es $482; el sistema tiene configurado ${parameters.find(p=>p.code==='DECIMO_14_BASE')?.value}. Revisa su vigencia antes de recalcular.</p><a href="https://www.trabajo.gob.ec/despues-de-casi-una-decada-hay-consenso-gobierno-empleadores-y-trabajadores-acuerdan-fijar-el-salario-basico-unificado-de-2026-en-usd-482-no-hay-imposicion-hay-union/" target="_blank" rel="noreferrer">Ministerio del Trabajo: SBU 2026</a></div></div>}
      <details className="tax-sources"><summary>Aporte personal y aporte patronal</summary><p>Para el sector privado general, el IESS publica 9,45% personal y 11,15% patronal. Un porcentaje patronal configurado mayor debe revisarse con su desglose y régimen; no se descuenta al trabajador.</p><a href="https://iess.gob.ec/es/preguntas-frecuentes-afiliacion" target="_blank" rel="noreferrer">Fuente: IESS</a></details>

      {/* Parameters Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {parameters.map(param => (
          <div key={param.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span className="badge badge-activo">Vigente</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {param.code}
                </span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>
                {param.name}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {param.description}
              </p>

              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--brand-primary)' }}>
                  {param.unit === '$' ? '$' : ''}{param.value}{param.unit !== '$' ? param.unit : ''}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Vigente desde: <strong>{param.effective_start_date}</strong>
                </div>
              </div>
            </div>

            {hasRole(['ADMIN']) && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', textAlign: 'right' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(param)}>
                  <Edit2 size={13} />
                  <span>Modificar Parámetro</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* History of Parameter Modifications */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={18} color="#8b5cf6" />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
            Historial de Modificaciones de Parámetros
          </h3>
        </div>

        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Parámetro</th>
                <th>Valor Anterior</th>
                <th>Nuevo Valor</th>
                <th>Motivo del Cambio</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No se registran cambios de parámetros históricos.
                  </td>
                </tr>
              ) : (
                history.map(h => (
                  <tr key={h.id}>
                    <td>{new Date(h.changed_at).toLocaleString('es-EC')}</td>
                    <td style={{ fontWeight: '700' }}>{h.parameter_code}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{h.previous_value}</td>
                    <td style={{ fontWeight: '800', color: 'var(--brand-primary)' }}>{h.new_value}</td>
                    <td>{h.reason || 'Actualización'}</td>
                    <td style={{ fontSize: '12px' }}>{h.changed_by_name || 'Admin'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Parameter */}
      {showEditModal && activeParam && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>
                Actualizar: {activeParam.name}
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
                  Valor Actual: <strong>{activeParam.value} {activeParam.unit}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Nuevo Valor ({activeParam.unit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Inicio de Vigencia *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Motivo o Justificación del Cambio *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="ej. Decreto Ejecutivo de aumento del SBU o resolución del IESS..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Parámetro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
