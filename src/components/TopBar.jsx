import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSolicitudes } from '../context/SolicitudesContext';
import { useNotification } from '../context/NotificationContext';
import { importarExcel, exportarExcel } from '../utils/excelIO';
import { exportarCIARP } from '../utils/exportCiarp.js';
import { ROL_COLORS } from '../data';
import { 
  Download, Upload, ChevronDown, ChevronUp, LogOut, CheckCircle, 
  Loader, ClipboardList, Landmark, Eye, Scale, FileText, User
} from 'lucide-react';

function getInitials(nombre = '') {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

function maskCedula(ced = '') {
  if (ced.length <= 4) return ced;
  return '*'.repeat(ced.length - 4) + ced.slice(-4);
}

export default function TopBar({ currentPage, setNav }) {
  const { user, logout } = useAuth();
  const { solicitudes, saving, saveMsg, importar } = useSolicitudes();
  const { success, error: showError } = useNotification();

  const [profileOpen, setProfileOpen] = useState(false);
  const [exportOpen,  setExportOpen]  = useState(false);

  const fileRef    = useRef(null);
  const profileRef = useRef(null);
  const exportRef  = useRef(null);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (exportRef.current  && !exportRef.current.contains(e.target))  setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rc      = user ? (ROL_COLORS[user.rol] || ROL_COLORS.lectura) : ROL_COLORS.lectura;
  const initials = user ? getInitials(user.nombre) : '?';
  const hora    = new Date().getHours();
  const saludo  = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imp = await importarExcel(file);
      importar(imp);
      success(`${imp.length} solicitudes importadas`);
    } catch (err) {
      showError(`Error al importar: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const canWrite = user?.rol !== 'lectura';

  return (
    <div className="topbar">
      {/* Título de página */}
      <div className="topbar-left">
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--uq-green-dk)' }}>
          {currentPage.icon}
        </span>
        <span className="topbar-page-title">{currentPage.title}</span>
        <span className="topbar-sub">· Asuntos Profesorales, Universidad del Quindío</span>
      </div>

      {/* Indicador de guardado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
        {saving  && <span className="save-badge saving pulse" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Loader size={14} /> Guardando...</span>}
        {saveMsg && (
          <span className={`save-badge ${saveMsg.includes('✅') ? 'success' : 'error'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {saveMsg.includes('✅') ? <CheckCircle size={14} /> : null}
            {saveMsg.replace('✅ ', '')}
          </span>
        )}
      </div>

      <div className="topbar-right">
        {/* Input de importación oculto */}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />

        {/* Menú Exportar / Importar — solo para roles con escritura */}
        {canWrite && (
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button
              className="btn btn-o btn-sm"
              onClick={() => setExportOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, border: '1px solid var(--border)', color: 'var(--text)', background: 'transparent' }}
            >
              <Download size={14} /> Exportar {exportOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {exportOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, boxShadow: 'var(--shadow-md)',
                minWidth: 260, zIndex: 999, overflow: 'hidden', padding: 8,
                animation: 'fadeUp .2s ease both', display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <button className="btn btn-gh btn-sm" style={{ justifyContent: 'flex-start', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}
                  onClick={() => { exportarExcel(solicitudes); setExportOpen(false); }}>
                  <ClipboardList size={15} /> Exportar Todas las Solicitudes
                </button>
                <button className="btn btn-gh btn-sm" style={{ justifyContent: 'flex-start', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}
                  onClick={() => { exportarCIARP(solicitudes.filter(s => ['informe','ciarp','proyectar_resoluciones'].includes(s.etapa)), 'Para_CIARP'); setExportOpen(false); }}>
                  <Landmark size={15} /> Exportar Informes al CIARP
                </button>
                <button className="btn btn-gh btn-sm" style={{ justifyContent: 'flex-start', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}
                  onClick={() => { exportarCIARP(solicitudes.filter(s => ['proyectar_resoluciones','archivada'].includes(s.etapa) && s.estado === 'aprobado'), 'Aprobados_CIARP'); setExportOpen(false); }}>
                  <CheckCircle size={15} /> Exportar Aprobados por CIARP
                </button>
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <button className="btn btn-gh btn-sm" style={{ justifyContent: 'flex-start', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}
                  onClick={() => { fileRef.current?.click(); setExportOpen(false); }}>
                  <Upload size={15} /> Importar desde Excel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Perfil de usuario */}
        <div ref={profileRef} style={{ position: 'relative', marginLeft: 8 }}>
          <button
            onClick={() => setProfileOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: profileOpen ? rc.light : 'transparent',
              border: `1px solid ${profileOpen ? rc.bg : 'transparent'}`,
              borderRadius: 40, padding: '4px 12px 4px 4px',
              cursor: 'pointer', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
            onMouseLeave={e => { if (!profileOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: user?.foto_url ? 'transparent' : rc.bg, color: '#fff',
              backgroundImage: user?.foto_url ? `url(${import.meta.env.VITE_API_URL}${user.foto_url})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              boxShadow: user?.foto_url ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none'
            }}>{!user?.foto_url && initials}</div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.nombre?.split(' ')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{rc.label}</div>
            </div>
            <span style={{ color: 'var(--muted)', marginLeft: 2, display: 'flex' }}>
              {profileOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {profileOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, boxShadow: 'var(--shadow-md)',
              width: 280, zIndex: 999, overflow: 'hidden',
              animation: 'fadeUp .2s ease both',
            }}>
              {/* Header con color de rol */}
              <div style={{ background: `linear-gradient(135deg, ${rc.bg} 0%, ${rc.bg}cc 100%)`, padding: '24px 20px 20px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: user?.foto_url ? 'transparent' : 'rgba(255,255,255,.2)', border: '2px solid rgba(255,255,255,.4)',
                  backgroundImage: user?.foto_url ? `url(${import.meta.env.VITE_API_URL}${user.foto_url})` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12,
                }}>{!user?.foto_url && initials}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{user?.nombre}</div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
                  background: 'rgba(0,0,0,.15)', borderRadius: 20,
                  padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,.9)', fontWeight: 600,
                }}>
                  {user?.rol === 'admin' ? <Landmark size={12} /> : user?.rol === 'tecnico' ? <Scale size={12} /> : user?.rol === 'asistente' ? <FileText size={12} /> : <Eye size={12} />} 
                  {rc.label}
                </div>
              </div>

              {/* Info de sesión */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  <span>Cédula</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace', letterSpacing: 0.5 }}>
                    {maskCedula(user?.cedula)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
                  <span>Acceso</span>
                  <span style={{ fontWeight: 600, color: user?.rol === 'lectura' ? 'var(--muted)' : 'var(--uq-green)' }}>
                    {user?.rol === 'lectura' ? 'Solo consulta' : 'Edición'}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {setNav && (
                  <button
                    onClick={() => { setProfileOpen(false); setNav('perfil'); }}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 10,
                      background: 'transparent', border: '1px solid transparent',
                      color: 'var(--text)', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <User size={16} /> Mi Perfil
                  </button>
                )}
                <button
                  onClick={() => { setProfileOpen(false); logout(); }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--danger)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8, transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
