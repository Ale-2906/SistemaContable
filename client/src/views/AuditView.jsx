import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Search, Filter, History, Eye, Terminal } from 'lucide-react';

export default function AuditView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [activeLog, setActiveLog] = useState(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        search,
        entity: selectedEntity,
        action: selectedAction
      });
      setLogs(res.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search, selectedEntity, selectedAction]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Registro Inmutable de Auditoría MYSUBS</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Trazabilidad de modificaciones salariales, cambios de parámetros, generación de roles y pagos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px' }}>
        <div className="toolbar">
          <div className="toolbar-search" style={{ flex: '1 1 300px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por usuario, acción o registro afectado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
            >
              <option value="">Todas las Entidades</option>
              <option value="EMPLOYEE">Empleados / Sueldos</option>
              <option value="PARAMETER">Parámetros de Nómina</option>
              <option value="PAYROLL">Nóminas</option>
              <option value="PAYMENT">Pagos</option>
              <option value="USER">Usuarios / Sesiones</option>
            </select>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="">Todas las Acciones</option>
              <option value="LOGIN_SUCCESS">Inicio de Sesión</option>
              <option value="CREATE_EMPLOYEE">Crear Empleado</option>
              <option value="SALARY_CHANGE">Cambio de Sueldo</option>
              <option value="UPDATE_PARAMETER">Modificar Parámetro</option>
              <option value="GENERATE_PAYROLL">Generar Nómina</option>
              <option value="APPROVE_PAYROLL">Aprobar Nómina</option>
              <option value="PAYMENT_PROCESSED">Pago Realizado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>ID Registro</th>
                <th>Dirección IP</th>
                <th style={{ textAlign: 'right' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    Cargando bitácora de auditoría...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No se registran eventos de auditoría con los filtros actuales.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      {new Date(log.created_at).toLocaleString('es-EC')}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{log.user_full_name || 'Sistema'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user_email || 'automático'}</div>
                    </td>
                    <td>
                      <span className="badge badge-activo" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{log.entity}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.entity_id || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{log.ip_address}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(log.old_values || log.new_values) && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setActiveLog(log)}
                        >
                          <Eye size={13} />
                          <span>Ver Valores</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View Audit Details */}
      {activeLog && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>
                Detalle de Auditoría #{activeLog.id} — {activeLog.action}
              </h3>
              <button onClick={() => setActiveLog(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--modal-danger)', marginBottom: '8px' }}>
                    Valor Anterior:
                  </h4>
                  <pre style={{
                    background: 'var(--bg-input)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    overflowX: 'auto',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}>
                    {activeLog.old_values ? JSON.stringify(JSON.parse(activeLog.old_values), null, 2) : 'Sin valor previo'}
                  </pre>
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--modal-success)', marginBottom: '8px' }}>
                    Nuevo Valor:
                  </h4>
                  <pre style={{
                    background: 'var(--bg-input)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    overflowX: 'auto',
                    border: '1px solid var(--border-color)',
                    color: 'var(--modal-success)'
                  }}>
                    {activeLog.new_values ? JSON.stringify(JSON.parse(activeLog.new_values), null, 2) : 'Sin valor nuevo'}
                  </pre>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveLog(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
