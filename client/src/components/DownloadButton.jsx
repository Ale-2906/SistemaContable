import React, { useState } from 'react';

export default function DownloadButton({ onDownload, children, ...props }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const download = async () => {
    setBusy(true);
    setError('');
    try {
      await onDownload();
    } catch (err) {
      setError(err.message || 'No se pudo descargar el archivo. Intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button {...props} type="button" disabled={busy || props.disabled} onClick={download} aria-busy={busy}>
        {busy ? 'Descargando...' : children}
      </button>
      {error && <p role="alert" style={{ color: 'var(--danger, #ef4444)', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}
