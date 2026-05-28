import React, { useRef, useState } from 'react';
import { getAuthToken } from '../utils/api';

const MAX_MB  = 10;

/**
 * Componente para subir PDFs/DOC/DOCX al servidor local.
 *
 * Props:
 *   customName      - Nombre base del archivo a guardar (sin extensión).
 *                     Si se omite, se usa el nombre original del archivo.
 *   folder          - Sub-carpeta (ej: "conceptos", "cvlac").
 *   initialFile     - { nombre, url } si ya hay un archivo guardado.
 *   onUploadSuccess - Callback cuando el upload fue exitoso.
 *                     Recibe: { fileName, publicUrl, storagePath }
 *   label           - Texto del botón de subida.
 */
export default function PdfUploader({
  customName,
  folder = 'docs',
  initialFile,
  onUploadSuccess,
  label = 'Subir concepto de evaluación',
}) {
  const inputRef   = useRef(null);
  const replaceRef = useRef(null);

  const [status,   setStatus]   = useState(initialFile ? 'success' : 'idle');
  const [uploaded, setUploaded] = useState(initialFile ?? null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);

  async function upload(file) {
    if (!file) return;

    // Validar tamaño
    if (file.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`El archivo supera el límite de ${MAX_MB} MB.`);
      setStatus('error');
      return;
    }

    // Validar tipo
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Solo se permiten archivos PDF, DOC o DOCX.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');
    setProgress(10);

    try {
      const ext      = file.name.split('.').pop().toLowerCase();
      const baseName = customName
        ? `${customName}.${ext}`
        : file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

      setProgress(30);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', baseName);
      formData.append('folder', folder);

      const apiBase = import.meta.env.VITE_API_URL || '';
      // En desarrollo (localhost) usamos ruta relativa para que el proxy de Vite
      // intercepte el request y lo reenvíe a localhost:3001 sin problemas CORS.
      // En producción, el frontend y backend son el mismo servidor.
      const uploadUrl = (apiBase && !window.location.hostname.includes('localhost'))
        ? `${apiBase}/api/v1/upload-pdf`
        : `/api/v1/upload-pdf`;

      const token = getAuthToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Error HTTP ${response.status}`);
      }

      setProgress(80);
      const resData = await response.json();
      setProgress(100);

      // webViewLink = URL completa al archivo en el servidor local
      const serverBase = apiBase || window.location.origin;
      const publicUrl = resData.webViewLink || `${serverBase}/uploads/${resData.fileName}`;

      const result = {
        fileName:    resData.fileName || baseName,
        publicUrl,
        storagePath: resData.fileName || baseName,
      };

      setUploaded(result);
      setStatus('success');
      onUploadSuccess?.(result);
    } catch (err) {
      console.error("Upload error:", err);
      // Evitar que el CSS uppercase oculte el error original:
      setErrorMsg(err?.message ? `Fallo: ${err.message}` : 'Error al subir el archivo.');
      setStatus('error');
    } finally {
      setProgress(0);
      if (inputRef.current)   inputRef.current.value   = '';
      if (replaceRef.current) replaceRef.current.value = '';
    }
  }

  return (
    <div>
      {/* ── Estado idle / error ── */}
      {status !== 'success' && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: status === 'uploading' ? 'wait' : 'pointer',
            background: status === 'error' ? '#fff0f0' : '#fffde7',
            border: `2px dashed ${status === 'error' ? '#f44336' : '#fbc02d'}`,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: status === 'error' ? '#c62828' : '#795548',
            transition: 'background 0.2s',
          }}
        >
          <span style={{ fontSize: 18 }}>
            {status === 'uploading' ? '⏳' : status === 'error' ? '❌' : '⬆️'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>
              {status === 'uploading'
                ? 'Subiendo a servidor local...'
                : status === 'error'
                ? errorMsg
                : label}
            </div>
            {status === 'idle' && (
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                PDF, DOC o DOCX · máx. {MAX_MB} MB
              </div>
            )}
            {status === 'uploading' && progress > 0 && (
              <div style={{ marginTop: 6, background: '#e0e0e0', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--uq-green, #2e7d32)',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            disabled={status === 'uploading'}
            onChange={e => upload(e.target.files?.[0])}
          />
        </label>
      )}

      {/* ── Estado success ── */}
      {status === 'success' && uploaded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#e8f5e9',
            border: '1px solid #a5d6a7',
            borderRadius: 8,
            padding: '8px 12px',
          }}
        >
          <span style={{ fontSize: 20 }}>📎</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#2e7d32', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {uploaded.fileName ?? uploaded.nombre}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
              Guardado en servidor local ·{' '}
              {(uploaded.publicUrl ?? uploaded.url) ? (
                <a
                  href={uploaded.publicUrl ?? uploaded.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#1565c0' }}
                >
                  Ver archivo ↗
                </a>
              ) : (
                <span style={{ color: '#999' }}>Sin enlace disponible</span>
              )}
            </div>
          </div>
          <label style={{ fontSize: 11, color: '#1565c0', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
            Reemplazar
            <input
              ref={replaceRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={e => upload(e.target.files?.[0])}
            />
          </label>
        </div>
      )}
    </div>
  );
}
