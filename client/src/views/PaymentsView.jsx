import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function PaymentsView() {
  const { hasRole } = useAuth();
  const [payingId, setPayingId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getPayments();
      setPayments(data);
    } catch (err) {
      setError(err.message || "Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const markPaid = async (batchId) => {
    if (payingId !== null) return;
    setPayingId(batchId);
    setError("");
    try {
      await api.markBatchPaid(batchId, { status: "PAGADO" });
      await fetchPayments();
    } catch (err) {
      setError(err.message || "Error al actualizar estado de pago");
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        <Loader2 className="spin-animation" size={24} />
        <p>Cargando pagos...</p>
      </div>
    );
  }

  return (
    <div className="view-container" style={{ padding: "24px" }}>
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <ShieldAlert size={16} style={{ marginRight: "8px" }} /> {error}
        </div>
      )}
      {!payments.length && (
        <p style={{ marginBottom: "16px" }}>
          No hay lotes de pagos. Primero genera y aprueba la nomina desde
          Periodos de Nomina.
        </p>
      )}
      <div className="table-responsive" style={{ overflowX: "auto" }}>
        <table
          className="table"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ background: "#1e293b", color: "#cbd5e1" }}>
              <th style={{ padding: "8px" }}>Período</th>
              <th style={{ padding: "8px" }}>Código</th>
              <th style={{ padding: "8px" }}>Fecha Pago</th>
              <th className="numeric">Monto total</th>
              <th style={{ padding: "8px" }}>Estado</th>
              <th style={{ padding: "8px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ padding: "8px" }}>
                  {p.period_name || p.period_id}
                </td>
                <td style={{ padding: "8px" }}>{p.code}</td>
                <td style={{ padding: "8px" }}>{p.payment_date}</td>
                <td className="numeric">
                  {Number(p.total_amount).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </td>
                <td style={{ padding: "8px" }}>
                  <span
                    className={`status-badge status-${p.status.toLowerCase()}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: "8px" }}>
                  {p.status === "PENDIENTE" && hasRole(["ADMIN", "RRHH"]) && (
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={payingId !== null}
                      onClick={() => markPaid(p.id)}
                    >
                      Registrar pago{" "}
                      <CheckCircle size={14} style={{ marginLeft: "4px" }} />
                    </button>
                  )}
                  {p.status === "PAGADO" && (
                    <button className="btn btn-sm btn-secondary" disabled>
                      Pagado{" "}
                      <CheckCircle size={14} style={{ marginLeft: "4px" }} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
