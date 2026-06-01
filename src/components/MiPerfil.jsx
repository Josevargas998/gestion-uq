import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Camera, Lock, User, Mail, Shield, CheckCircle, Loader, Trash2 } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function MiPerfil() {
  const { user, updateUserContext } = useAuth();
  const { success, error: showError } = useNotification();
  
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [correo, setCorreo] = useState('');
  const [privacidad, setPrivacidad] = useState({ mostrar_correo: true });
  
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  // Load current data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiFetch('/api/auth/me');
        if (data) {
          setCorreo(data.correo || '');
          setPrivacidad(data.privacidad || { mostrar_correo: true });
          updateUserContext({ foto_url: data.foto_url, correo: data.correo, privacidad: data.privacidad });
        }
      } catch (err) {
        showError('No se pudo cargar la información del perfil');
      }
    }
    loadData();
  }, [updateUserContext, showError]);

  const handleFotoClick = () => fileInputRef.current?.click();

  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/foto`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('gestion_uq_token')}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al subir foto');
      
      updateUserContext({ foto_url: data.foto_url });
      success('Foto de perfil actualizada correctamente');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFoto = async () => {
    if (!window.confirm('¿Estás seguro de que deseas quitar tu foto de perfil?')) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/foto`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('gestion_uq_token')}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al quitar foto');
      
      updateUserContext({ foto_url: null });
      success('Foto de perfil quitada correctamente');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ correo, privacidad })
      });
      updateUserContext({ correo: data.correo, privacidad: data.privacidad });
      success('Perfil actualizado correctamente');
    } catch (err) {
      showError(err.message || 'Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return showError('Las contraseñas nuevas no coinciden');
    }
    if (passwords.new.length < 6) {
      return showError('La contraseña debe tener al menos 6 caracteres');
    }

    setLoading(true);
    try {
      await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        })
      });
      success('Contraseña actualizada correctamente');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      showError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || '';
  const fotoUrl = user?.foto_url ? `${apiBase}${user.foto_url}` : null;
  const initials = user?.nombre?.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 40px' }}>
      
      {/* Cabecera / Avatar */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--uq-green)', color: '#fff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700,
            backgroundImage: fotoUrl ? `url("${fotoUrl}")` : 'none', backgroundSize: 'cover', backgroundPosition: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
          }}>
            {!fotoUrl && initials}
          </div>
          <div style={{ position: 'absolute', bottom: -5, right: -15, display: 'flex', gap: 6 }}>
            <button 
              onClick={handleFotoClick}
              style={{ 
                background: '#fff', border: '1px solid #ddd', 
                borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#555', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--uq-green)'}
              onMouseLeave={e => e.currentTarget.style.color = '#555'}
              title={fotoUrl ? "Cambiar foto" : "Subir foto"}
            >
              {loading ? <Loader size={16} className="spin" /> : <Camera size={16} />}
            </button>
            {fotoUrl && (
              <button 
                onClick={handleRemoveFoto}
                style={{ 
                  background: '#fff', border: '1px solid #ddd', 
                  borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#f44336', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#d32f2f'}
                onMouseLeave={e => e.currentTarget.style.color = '#f44336'}
                title="Quitar foto"
              >
                {loading ? <Loader size={16} className="spin" /> : <Trash2 size={16} />}
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFotoChange} accept="image/png, image/jpeg, image/jpg" style={{ display: 'none' }} />
        </div>
        
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, color: '#111' }}>{user?.nombre}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#666', fontSize: 14 }}>
            <span style={{ background: '#f0f0f0', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>{user?.rolLabel}</span>
            <span>Cédula: {user?.cedula}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        
        {/* Sidebar Tabs */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <button 
              onClick={() => setActiveTab('general')}
              style={{ 
                width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: 'none',
                background: activeTab === 'general' ? '#f0f9f4' : 'transparent',
                color: activeTab === 'general' ? 'var(--uq-green)' : '#555',
                fontWeight: activeTab === 'general' ? 700 : 500,
                borderLeft: `4px solid ${activeTab === 'general' ? 'var(--uq-green)' : 'transparent'}`,
                cursor: 'pointer', textAlign: 'left', fontSize: 14, transition: 'all 0.2s'
              }}
            >
              <User size={18} /> Información Personal
            </button>
            <button 
              onClick={() => setActiveTab('seguridad')}
              style={{ 
                width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: 'none',
                background: activeTab === 'seguridad' ? '#f0f9f4' : 'transparent',
                color: activeTab === 'seguridad' ? 'var(--uq-green)' : '#555',
                fontWeight: activeTab === 'seguridad' ? 700 : 500,
                borderLeft: `4px solid ${activeTab === 'seguridad' ? 'var(--uq-green)' : 'transparent'}`,
                cursor: 'pointer', textAlign: 'left', fontSize: 14, transition: 'all 0.2s'
              }}
            >
              <Shield size={18} /> Seguridad
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          
          {activeTab === 'general' && (
            <form onSubmit={handleSaveProfile} style={{ animation: 'fadeUp 0.3s ease' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: 18, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={20} color="var(--uq-green)" /> Configuración General
              </h2>
              
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 8, fontSize: 13 }}><Mail size={16}/> Correo Electrónico</label>
                <input 
                  type="email" 
                  className="input" 
                  value={correo} 
                  onChange={e => setCorreo(e.target.value)} 
                  placeholder="ejemplo@uniquindio.edu.co"
                  style={{ width: '100%', maxWidth: 400 }}
                />
              </div>

              <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #eee', marginBottom: 24, maxWidth: 400 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#333' }}>
                  <input 
                    type="checkbox" 
                    checked={privacidad.mostrar_correo}
                    onChange={e => setPrivacidad({ ...privacidad, mostrar_correo: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--uq-green)' }}
                  />
                  Hacer mi correo visible para otros usuarios del sistema
                </label>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {loading ? <Loader size={16} className="spin" /> : <CheckCircle size={16} />}
                Guardar Cambios
              </button>
            </form>
          )}

          {activeTab === 'seguridad' && (
            <form onSubmit={handleChangePassword} style={{ animation: 'fadeUp 0.3s ease' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: 18, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={20} color="var(--uq-green)" /> Cambiar Contraseña
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, marginBottom: 24 }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, display: 'block' }}>Contraseña actual</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={passwords.current} 
                    onChange={e => setPasswords({ ...passwords, current: e.target.value })} 
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, display: 'block' }}>Nueva contraseña</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={passwords.new} 
                    onChange={e => setPasswords({ ...passwords, new: e.target.value })} 
                    required
                    minLength={6}
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, display: 'block' }}>Confirmar nueva contraseña</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={passwords.confirm} 
                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} 
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {loading ? <Loader size={16} className="spin" /> : <Shield size={16} />}
                Actualizar Contraseña
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
