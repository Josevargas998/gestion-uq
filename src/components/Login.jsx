import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROL_INFO } from '../data';
import illustration from '../assets/login-illustration.png';




export default function Login() {
  const { login, loading, error } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [trackId, setTrackId] = useState('');

  const handleAcceder = async (e) => {
    e.preventDefault();
    setLocalError('');
    const cedula = usuario.trim();
    const pass = password.trim();

    if (!cedula || !pass) {
      setLocalError('Ingrese su cédula y contraseña.');
      return;
    }

    const ok = await login(cedula, pass);
    if (!ok && !error) {
      setLocalError('Error al iniciar sesión. Verifique sus credenciales.');
    }
  };

  const displayError = localError || error;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff', fontFamily: "'Nunito', sans-serif" }}>

      <div style={{
        flex: 1,
        backgroundImage: `url(${illustration})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: '40px'
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          background: 'rgba(255,255,255,0.88)',
          padding: '20px 30px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(4px)',
          zIndex: 2,
          maxWidth: '350px'
        }}>
          <h1 style={{ fontSize: 32, fontWeight: 300, color: '#333', margin: 0, letterSpacing: '1px' }}>
            UNI<span style={{ fontWeight: 800 }}>QUINDÍO</span>
          </h1>
          <h2 style={{ fontSize: 20, fontWeight: 400, color: '#555', margin: '4px 0 12px' }}>
            en conexión territorial
          </h2>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #ffc107, #dc3545, #007bff, #28a745)', margin: '0 auto 12px', width: '80%' }} />
          <p style={{ fontSize: 14, color: '#444', fontWeight: 600, margin: 0 }}>
            www.uniquindio.edu.co
          </p>
        </div>
      </div>

      <div style={{
        width: '460px',
        padding: '50px 50px 30px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        zIndex: 10,
        overflowY: 'auto',
        background: '#fff'
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>
          Universidad del Quindío
        </h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 35 }}>
          Servicio de autenticación para ciudadanos y funcionarios
        </p>

        <form onSubmit={handleAcceder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {displayError && (
            <div style={{ color: '#dc3545', fontSize: 13, padding: '10px 12px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4 }}>
              {displayError}
            </div>
          )}

          <input
            type="text"
            placeholder="Correo o Cédula"
            value={usuario}
            onChange={e => { setUsuario(e.target.value); setLocalError(''); }}
            style={{ padding: '12px 16px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = '#428bca'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => { setPassword(e.target.value); setLocalError(''); }}
            style={{ padding: '12px 16px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = '#428bca'}
            onBlur={e => e.target.style.borderColor = '#ddd'}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#6c9fca' : '#428bca',
              color: '#fff', border: 'none', borderRadius: 4, padding: '12px',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8, transition: 'background 0.2s',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#3071a9'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#428bca'; }}
          >
            {loading ? '⏳ Verificando...' : '➜ Acceder'}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 12, color: '#666' }}>
          Si no recuerda su contraseña haga click <a href="#" onClick={(e) => { e.preventDefault(); alert('Si olvidó su contraseña, por favor envíe un correo a asuntosprofesorales@uniquindio.edu.co o acérquese a la oficina administrativa para restablecerla.'); }} style={{ color: '#428bca', textDecoration: 'none' }}>Aquí</a>
        </div>

        {/* --- TRACKING SECTION --- */}
        <div style={{ marginTop: 25, background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #ddd' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#333', marginBottom: 8 }}>🔍 Rastrear Trámite Docente</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>Consulte el estado de sus solicitudes de productividad académica o ascenso en escalafón.</p>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if(trackId) window.location.href = `/?rastreo=${trackId}`;
            }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input 
              type="text" 
              placeholder="Ej: SOL-2025-001" 
              value={trackId}
              onChange={e => setTrackId(e.target.value.trim())}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
            />
            <button 
              type="submit"
              style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px', fontWeight: 700, cursor: trackId ? 'pointer' : 'not-allowed', opacity: trackId ? 1 : 0.6 }}>
              Consultar
            </button>
          </form>
        </div>

        <div style={{ marginTop: 35 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 4 }}>Acciones de PQRSDF</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Haga clic en la opción que desea realizar.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { 
                color: '#ffc107', icon: '💬', title: 'Crear o consultar PQRSDF', desc: 'Ingrese aquí para crear y consultar PQRSDF.',
                onClick: () => window.open('https://www.uniquindio.edu.co/pqrsdf', '_blank')
              },
              { 
                color: '#dc3545', icon: '📖', title: 'Guía para gestionar sus PQRSDF', desc: '¿Cómo gestionar tus solicitudes de PQRSDF? Consulte aquí.',
                onClick: () => window.open('https://www.uniquindio.edu.co/documentos/guia-pqrsdf', '_blank')
              },
              { 
                color: '#28a745', icon: '👤', title: 'Registrarse', desc: 'Regístrese como ciudadano para crear y hacer seguimiento de sus PQRSDF.',
                onClick: () => alert('⚠️ El registro directo está deshabilitado.\n\nEl acceso a este sistema es gestionado por la Oficina de Asuntos Profesorales. Si es docente de planta y no tiene credenciales, por favor contacte a la administración.')
              },
              { 
                color: '#007bff', icon: '🏛️', title: 'Universidad del Quindío', desc: 'Acceso a la página web oficial de la institución.',
                onClick: () => window.open('https://www.uniquindio.edu.co', '_blank')
              },
            ].map((item, i) => (
              <div
                key={i}
                onClick={item.onClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px',
                  borderLeft: `4px solid ${item.color}`,
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ fontSize: 22, minWidth: 32, textAlign: 'center' }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: '#777', marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 40, textAlign: 'center', fontSize: 11, color: '#aaa' }}>
          Universidad del Quindío © 2026
        </div>
      </div>
    </div>
  );
}
