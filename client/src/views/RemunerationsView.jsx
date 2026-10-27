import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import DownloadButton from '../components/DownloadButton';
import { useAuth } from '../context/AuthContext';
import {
  Table, Calculator, Download, Printer, Search, Filter,
  Edit3, DollarSign, CheckCircle2, AlertCircle, ShieldAlert,
  ArrowRight, TrendingUp, Users, Sparkles
} from 'lucide-react';

export default function RemunerationsView() {
  const { hasRole } = useAuth();
  const [data, setData] = useState({ rows: [], totals: {}, parametersUsed: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRegime, setSelectedRegime] = useState('');

  // Quick Real-Time Simulator State
  const [simSalary, setSimSalary] = useState(1000);
  const [simResult, setSimResult] = useState(null);

  // Inline salary editing state
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [editSalaryValue, setEditSalaryValue] = useState('');
  const [editReason, setEditReason] = useState('');

  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadRemunerations = async () => {
    setLoading(true);
    try {
      const res = await api.getRemunerations({ search, regimeId: selectedRegime });
      setData(res);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRemunerations();
  }, [search, selectedRegime]);

  // Real-time simulator calculation
  useEffect(() => {
    if (simSalary >= 0) {
      api.simulateRemuneration(simSalary)
        .then(setSimResult)
        .catch(console.error);
    }
  }, [simSalary]);

  const handleSaveInlineSalary = async (empId) => {
    if (editSalaryValue === '' || isNaN(Number(editSalaryValue)) || Number(editSalaryValue) < 0) {
      showToast('Por favor ingrese un sueldo válido', 'error');
      return;
    }

    try {
      await api.updateEmployeeSalaryInline(empId, {
        newSalary: Number(editSalaryValue),
        reason: editReason || 'Ajuste en Cuadro de Remuneraciones'
      });
      showToast('Remuneración actualizada. Los cálculos fueron recalculados.');
      setEditingEmpId(null);
      loadRemunerations();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const { rows = [], totals = {}, parametersUsed = {} } = data;

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {notification && (
        <div className="toast-container">
          <div className={`toast toast-${notification.type}`}>
            {notification.type === 'success' ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Cuadro Oficial de Remuneraciones MYSUBS</h2>
            <span className="badge badge-activo">Estructura Oficial</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Cálculo automatizado de aportes IESS, décimo tercero, décimo cuarto, fondos de reserva y RUM
          </p>
        </div>

        <div className="toolbar-actions no-print">
          <DownloadButton
            onDownload={api.downloadRemunerationsExcel}
            className="btn btn-secondary"

          >
            <Download size={15} />
            <span>Exportar Excel (.xlsx)</span>
          </DownloadButton>

          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Distinction Banner: Employee Net vs Company Cost (Requirement 20) */}
      <div className="remunerations-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Card 1: Dinero que recibe el colaborador */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 95, 70, 0.15))',
          borderColor: 'rgba(16, 185, 129, 0.35)',
          padding: '18px 24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#34d399' }}>
              Dinero que Recibe el Colaborador
            </span>
            <Users size={18} color="#34d399" />
          </div>
          <div className="remunerations-summary-values" style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#10b981' }}>
                ${totals.rumConDecimos?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                RUM Mensual con Décimos y Fondos
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
                ${totals.rumSinDecimos?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                RUM Neto sin Décimos (Sueldo - IESS)
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Costo Total para la Empresa MYSUBS */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(30, 58, 138, 0.15))',
          borderColor: 'rgba(59, 130, 246, 0.35)',
          padding: '18px 24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#60a5fa' }}>
              Costo Total para MYSUBS
            </span>
            <DollarSign size={18} color="#60a5fa" />
          </div>
          <div className="remunerations-summary-values" style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#3b82f6' }}>
                ${totals.costoTotalEmpresa?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Costo Mensual Empresa (Sueldo + Patronal + Beneficios)
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#a78bfa' }}>
                ${totals.costoAnualEmpresa?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Costo Anual Proyectado (12 meses)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Interactive Simulator Card (Requirement 35) */}
      <div className="card no-print" style={{
        background: 'var(--bg-card-solid)',
        border: '1px solid var(--border-highlight)',
        padding: '20px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--brand-light)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800' }}>
                Simulador de Cálculo en Tiempo Real
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Modifique la remuneración mensual y observe inmediatamente la recalculación de todos los rubros
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              Remuneración de Prueba ($):
            </span>
            <input
              type="number"
              step="10"
              min="0"
              className="form-control"
              style={{ width: '140px', fontWeight: '800', fontSize: '16px', color: 'var(--brand-primary)' }}
              value={simSalary}
              onChange={(e) => setSimSalary(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {simResult && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            background: 'var(--bg-input)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aporte Patronal ({parametersUsed.patronalRate}%)</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>${simResult.aportePatronal.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aporte Personal ({parametersUsed.personalRate}%)</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#f87171' }}>${simResult.aportePersonal.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Décimo cuarto Mensual</div>
              <div style={{ fontSize: '14px', fontWeight: '800' }}>${simResult.decimo14Mensual.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Décimo tercero Mensual</div>
              <div style={{ fontSize: '14px', fontWeight: '800' }}>${simResult.decimo13Mensual.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fondos Reserva ({parametersUsed.reserveFundRate}%)</div>
              <div style={{ fontSize: '14px', fontWeight: '800' }}>${simResult.fondosReserva.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>RUM con Décimos</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>${simResult.rumConDecimos.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>RUM sin Décimos</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#38bdf8' }}>${simResult.rumSinDecimos.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase' }}>Costo Empresa Total</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#a78bfa' }}>${simResult.costoTotalEmpresa.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="card no-print" style={{ padding: '14px 20px' }}>
        <div className="toolbar">
          <div className="toolbar-search" style={{ flex: '1 1 300px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filtrar por cargo, colaborador o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Parámetros: Patronal <strong>{parametersUsed.patronalRate}%</strong> • Personal <strong>{parametersUsed.personalRate}%</strong> • Reserva <strong>{parametersUsed.reserveFundRate}%</strong> • SBU <strong>${parametersUsed.decimo14Base}</strong>
          </div>
        </div>
      </div>

      {/* Main Remunerations Table (Exact columns matching specification) */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>DENOMINACIÓN</th>
                <th>RÉGIMEN LABORAL</th>
                <th>JORNADA DE TRABAJO</th>
                <th>REMUNERACIÓN MENSUAL</th>
                <th>APORTE PATRONAL</th>
                <th>APORTE PERSONAL</th>
                <th>DÉCIMO CUARTO</th>
                <th>DÉCIMO CUARTO MENSUAL</th>
                <th>DÉCIMO TERCERO</th>
                <th>DÉCIMO TERCERO MENSUAL</th>
                <th>FONDOS DE RESERVA</th>
                <th style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>RUM MENSUAL CON DÉCIMOS</th>
                <th style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>RUM MENSUAL SIN DÉCIMOS</th>
                <th className="no-print" style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="15" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    Cargando cuadro de remuneraciones...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="15" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No hay colaboradores activos para mostrar en el cuadro de remuneraciones.
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.employeeId}>
                    <td style={{ fontWeight: '700', textAlign: 'center' }}>{r.no}</td>
                    <td>
                      <div style={{ fontWeight: '800', color: 'var(--text-main)' }}>{r.denominacion}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.employeeName}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{r.regimenLaboral}</td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{r.jornadaTrabajo}</td>
                    
                    {/* Remuneracion Mensual with inline editor */}
                    <td style={{ fontWeight: '800' }}>
                      {editingEmpId === r.employeeId ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="number"
                            step="1"
                            className="form-control"
                            style={{ width: '90px', padding: '4px 8px', fontSize: '12.5px' }}
                            value={editSalaryValue}
                            onChange={(e) => setEditSalaryValue(e.target.value)}
                            autoFocus
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => handleSaveInlineSalary(r.employeeId)}
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => setEditingEmpId(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', color: 'var(--brand-primary)' }}>
                            ${r.monthlySalary.toFixed(2)}
                          </span>
                          {hasRole(['ADMIN']) && (
                            <button
                              className="btn btn-secondary btn-icon no-print"
                              style={{ width: '22px', height: '22px' }}
                              title="Modificar salario"
                              onClick={() => {
                                setEditingEmpId(r.employeeId);
                                setEditSalaryValue(r.monthlySalary);
                                setEditReason('');
                              }}
                            >
                              <Edit3 size={11} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    <td>${r.aportePatronal.toFixed(2)}</td>
                    <td style={{ color: '#f87171' }}>${r.aportePersonal.toFixed(2)}</td>
                    <td>${r.decimo14Anual.toFixed(2)}</td>
                    <td>${r.decimo14Mensual.toFixed(2)}</td>
                    <td>${r.decimo13Anual.toFixed(2)}</td>
                    <td>${r.decimo13Mensual.toFixed(2)}</td>
                    <td>${r.fondosReserva.toFixed(2)}</td>

                    {/* RUM Mensual con Décimos */}
                    <td style={{ fontWeight: '900', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', fontSize: '14px' }}>
                      ${r.rumConDecimos.toFixed(2)}
                    </td>

                    {/* RUM Mensual sin Décimos */}
                    <td style={{ fontWeight: '800', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.05)', fontSize: '13.5px' }}>
                      ${r.rumSinDecimos.toFixed(2)}
                    </td>

                    <td className="no-print" style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Costo: ${r.costoTotalEmpresa.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* TOTAL Row (Requirement 11) */}
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right', fontWeight: '900', letterSpacing: '0.8px', fontSize: '13px' }}>
                    TOTAL ({totals.employeeCount} CARGOS/COLABORADORES):
                  </td>
                  <td style={{ fontWeight: '900', color: 'var(--brand-primary)', fontSize: '15px' }}>
                    ${totals.monthlySalary?.toFixed(2)}
                  </td>
                  <td style={{ fontWeight: '800' }}>${totals.aportePatronal?.toFixed(2)}</td>
                  <td style={{ fontWeight: '800', color: '#f87171' }}>${totals.aportePersonal?.toFixed(2)}</td>
                  <td style={{ fontWeight: '800' }}>${totals.decimo14Anual?.toFixed(2)}</td>
                  <td style={{ fontWeight: '800' }}>${totals.decimo14Mensual?.toFixed(2)}</td>
                  <td style={{ fontWeight: '800' }}>${totals.decimo13Anual?.toFixed(2)}</td>
                  <td style={{ fontWeight: '800' }}>${totals.decimo13Mensual?.toFixed(2)}</td>
                  <td style={{ fontWeight: '800' }}>${totals.fondosReserva?.toFixed(2)}</td>
                  <td style={{ fontWeight: '900', color: '#10b981', fontSize: '16px', background: 'rgba(16, 185, 129, 0.1)' }}>
                    ${totals.rumConDecimos?.toFixed(2)}
                  </td>
                  <td style={{ fontWeight: '900', color: '#38bdf8', fontSize: '15px', background: 'rgba(56, 189, 248, 0.1)' }}>
                    ${totals.rumSinDecimos?.toFixed(2)}
                  </td>
                  <td className="no-print" style={{ textAlign: 'right', fontWeight: '800', color: '#a78bfa' }}>
                    Costo Total: ${totals.costoTotalEmpresa?.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
