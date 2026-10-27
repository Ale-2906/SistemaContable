import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import DownloadButton from '../components/DownloadButton';
import {
  FileSpreadsheet, Download, FileText, Printer, CheckCircle2,
  Calendar, Users, DollarSign, TrendingUp
} from 'lucide-react';

export default function ReportsView({ onSelectPeriodForPayroll }) {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    api.getPeriods().then(res => {
      setPeriods(res);
      if (res.length > 0) setSelectedPeriod(res[0].id);
    }).catch(console.error);
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Centro de Reportes y Exportación MYSUBS</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Descarga de cuadros de remuneraciones en formato Excel oficial (.xlsx), nómina y constancias
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Card 1: Cuadro de Remuneraciones Oficial (.xlsx) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <FileSpreadsheet size={20} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>
              Cuadro de Remuneraciones (.xlsx)
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Descarga la hoja de cálculo completa con la estructura oficial: Denominación, Régimen, Jornada, Remuneración, Aportes, Décimos, Fondos de Reserva y RUM con fila de TOTALES.
            </p>
          </div>

          <DownloadButton
            onDownload={api.downloadRemunerationsExcel}
            className="btn btn-primary"

            style={{ width: '100%' }}
          >
            <Download size={15} />
            <span>Descargar Archivo Excel (.xlsx)</span>
          </DownloadButton>
        </div>

        {/* Card 2: Reporte de Nómina por Período (CSV / Excel) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Calendar size={20} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>
              Reporte de Nómina por Período
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Desglose detallado de sueldos base, ingresos extras, deducciones y líquido a pagar por colaborador para el período seleccionado.
            </p>

            <div className="form-group">
              <label className="form-label">Seleccionar Período:</label>
              <select
                className="form-control"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                ))}
              </select>
            </div>
          </div>

          {selectedPeriod && (
            <DownloadButton
              onDownload={() => api.downloadPayrollCsv(selectedPeriod)}
              className="btn btn-secondary"

              style={{ width: '100%' }}
            >
              <Download size={15} />
              <span>Exportar Reporte de Nómina</span>
            </DownloadButton>
          )}
        </div>

        {/* Card 3: Reporte Maestro de Colaboradores */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Users size={20} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>
              Padrón General de Colaboradores
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Listado completo con cédulas, nombres, cargos, regímenes laborales, horarios, sueldos base y datos de contacto de todo el personal.
            </p>
          </div>

          <DownloadButton
            onDownload={api.downloadEmployeesCsv}
            className="btn btn-secondary"

            style={{ width: '100%' }}
          >
            <Download size={15} />
            <span>Descargar Padrón de Empleados</span>
          </DownloadButton>
        </div>
      </div>
    </div>
  );
}
