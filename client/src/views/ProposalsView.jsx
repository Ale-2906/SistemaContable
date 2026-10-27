import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Layers, Plus, TrendingUp, Users, DollarSign, CheckCircle2,
  AlertCircle, Building2, Briefcase, Eye, BarChart3
} from 'lucide-react';

export default function ProposalsView() {
  const { hasRole } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState(null);

  const [propForm, setPropForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({
    positionName: '',
    laborRegime: 'CÓDIGO DE TRABAJO',
    workSchedule: '08H00 A 17H00',
    monthlySalary: 527.00,
    employeeCount: 1
  });

  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadProposals = async () => {
    setLoading(true);
    try {
      const res = await api.getProposals();
      setProposals(res);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    try {
      await api.createProposal(propForm);
      showToast('Nueva propuesta de escenario creada');
      setShowAddModal(false);
      setPropForm({ name: '', description: '' });
      loadProposals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedPropId) return;
    try {
      await api.addProposalItem(selectedPropId, itemForm);
      showToast('Cargo agregado a la propuesta');
      setShowAddItemModal(false);
      loadProposals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const maxCost = Math.max(...proposals.map(p => p.totalMonthlyCost), 1);

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
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Propuestas y Escenarios de Personal MYSUBS</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Simulación y comparación de estructuras laborales, costos salariales y presupuestos de nómina
          </p>
        </div>

        {hasRole(['ADMIN', 'RRHH']) && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Crear Escenario / Propuesta</span>
          </button>
        )}
      </div>

      {/* Side-by-Side Comparison Table (Requirement 26) */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={18} color="var(--brand-primary)" />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
            Comparativa de Escenarios de Presupuesto Laboral
          </h3>
        </div>

        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Concepto</th>
                {proposals.map(p => (
                  <th key={p.id} style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-main)' }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={proposals.length + 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    Cargando propuestas...
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={proposals.length + 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No se registran propuestas de personal.
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td style={{ fontWeight: '700' }}>Cantidad de Empleados</td>
                    {proposals.map(p => (
                      <td key={p.id} style={{ textAlign: 'center', fontWeight: '800', fontSize: '15px' }}>
                        <span className="badge badge-activo">{p.employeeCount} Colaboradores</span>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td style={{ fontWeight: '600' }}>Remuneraciones Básicas (Masa Salarial)</td>
                    {proposals.map(p => (
                      <td key={p.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                        ${p.totalSalaries.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td style={{ fontWeight: '600' }}>Aportes Patronales IESS (12.15%)</td>
                    {proposals.map(p => (
                      <td key={p.id} style={{ textAlign: 'center', color: '#60a5fa', fontWeight: '700' }}>
                        ${p.totalPatronal.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td style={{ fontWeight: '600' }}>Beneficios (Décimo tercero y décimo cuarto y Fondos)</td>
                    {proposals.map(p => (
                      <td key={p.id} style={{ textAlign: 'center', color: '#f59e0b', fontWeight: '700' }}>
                        ${p.totalBenefits.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td style={{ fontWeight: '600' }}>Total RUM Mensual con Décimos</td>
                    {proposals.map(p => (
                      <td key={p.id} style={{ textAlign: 'center', color: '#34d399', fontWeight: '700' }}>
                        ${p.totalRumConDecimos.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  <tr style={{ background: 'var(--bg-input)' }}>
                    <td style={{ fontWeight: '800', textTransform: 'uppercase', color: 'var(--brand-primary)', fontSize: '13.5px' }}>
                      COSTO MENSUAL TOTAL MYSUBS
                    </td>
                    {proposals.map(p => (
                      <td key={p.id} style={{ textAlign: 'center', fontWeight: '900', color: 'var(--brand-primary)', fontSize: '17px' }}>
                        ${p.totalMonthlyCost.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td style={{ fontWeight: '800', textTransform: 'uppercase', color: '#a78bfa' }}>
                      COSTO ANUAL PROYECTADO (12M)
                    </td>
                    {proposals.map(p => (
                      <td key={p.id} style={{ textAlign: 'center', fontWeight: '800', color: '#a78bfa', fontSize: '15px' }}>
                        ${p.totalAnnualCost.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Cost Comparison Bars */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>
          <TrendingUp size={18} color="#3b82f6" />
          <span>Comparación Gráfica del Presupuesto Mensual</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {proposals.map(p => {
            const pct = Math.round((p.totalMonthlyCost / maxCost) * 100);
            return (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700' }}>{p.name} ({p.employeeCount} empleados)</span>
                  <span style={{ fontWeight: '800', color: 'var(--brand-primary)' }}>
                    ${p.totalMonthlyCost.toFixed(2)} / mes (${p.totalAnnualCost.toFixed(2)} / año)
                  </span>
                </div>
                <div style={{ width: '100%', height: '12px', background: 'var(--bg-input)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                    borderRadius: '6px',
                    transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proposal Cards with Positions Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {proposals.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '800' }}>{p.name}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.description}</p>
                </div>
                <span className="badge badge-activo">{p.employeeCount} personas</span>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Costo Mensual Empresa:</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--brand-primary)' }}>
                  ${p.totalMonthlyCost.toFixed(2)}
                </span>
              </div>

              {/* Positions list in this scenario */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {p.items?.map((it, idx) => (
                  <div key={idx} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12.5px'
                  }}>
                    <div>
                      <div style={{ fontWeight: '700' }}>
                        {it.employee_count}x {it.position_name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {it.work_schedule} • {it.labor_regime}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '800' }}>
                      ${(it.monthly_salary * it.employee_count).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {hasRole(['ADMIN', 'RRHH']) && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '16px', textAlign: 'right' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedPropId(p.id);
                    setShowAddItemModal(true);
                  }}
                >
                  <Plus size={13} />
                  <span>Añadir Cargo al Escenario</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: New Proposal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Crear Nueva Propuesta de Personal</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreateProposal}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Escenario *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. Propuesta 4 - Locales Franquiciados"
                    value={propForm.name}
                    onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Objetivo o hipótesis de este escenario..."
                    value={propForm.description}
                    onChange={(e) => setPropForm({ ...propForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Escenario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Item to Proposal */}
      {showAddItemModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Añadir Cargo al Escenario</h3>
              <button onClick={() => setShowAddItemModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Cargo *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ej. ASISTENTE DE VENTAS"
                    value={itemForm.positionName}
                    onChange={(e) => setItemForm({ ...itemForm, positionName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Remuneración Mensual ($) *</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={itemForm.monthlySalary}
                      onChange={(e) => setItemForm({ ...itemForm, monthlySalary: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cantidad de Personas *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={itemForm.employeeCount}
                      onChange={(e) => setItemForm({ ...itemForm, employeeCount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Régimen Laboral</label>
                    <select
                      className="form-control"
                      value={itemForm.laborRegime}
                      onChange={(e) => setItemForm({ ...itemForm, laborRegime: e.target.value })}
                    >
                      <option value="CÓDIGO DE TRABAJO">CÓDIGO DE TRABAJO</option>
                      <option value="LOEP">LOEP</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Jornada</label>
                    <select
                      className="form-control"
                      value={itemForm.workSchedule}
                      onChange={(e) => setItemForm({ ...itemForm, workSchedule: e.target.value })}
                    >
                      <option value="08H00 A 17H00">08H00 A 17H00</option>
                      <option value="06:00 - 14:00">06:00 - 14:00</option>
                      <option value="14:00 - 22:00">14:00 - 22:00</option>
                      <option value="22:00 - 06:00">22:00 - 06:00</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddItemModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Agregar Cargo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
