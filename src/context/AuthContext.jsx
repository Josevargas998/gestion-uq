/**
 * AuthContext.jsx — Contexto de autenticación
 * Usa el backend local Express en lugar de Supabase.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loginConCedula, setAuthToken, registerSessionExpiredCallback } from '../utils/api';
import { ROL_INFO } from '../data';
import { logger } from '../utils/logger';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try {
      const stored = sessionStorage.getItem('gestion_uq_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Persistir sesión en sessionStorage
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('gestion_uq_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('gestion_uq_user');
    }
  }, [user]);

  const login = useCallback(async (cedula, password) => {
    setLoading(true);
    setError('');

    const cedulaLimpia = String(cedula).trim();
    const passLimpia   = password ? String(password).trim() : '';

    if (!cedulaLimpia) {
      setError('Ingrese su número de cédula.');
      setLoading(false);
      return false;
    }

    try {
      // Envía password si se proporcionó (usuario de oficina)
      // Si no hay password, el backend intenta validarlo como docente
      const userData = await loginConCedula(cedulaLimpia, passLimpia || undefined);

      // Guardar el JWT en sessionStorage para que apiFetch lo use
      if (userData?.token) setAuthToken(userData.token);

      const userRol = userData.rol ? String(userData.rol).trim().toLowerCase() : 'lectura';
      const info = ROL_INFO[userRol] || ROL_INFO.lectura;
      setUser({
        rol:        userRol,
        nombre:     userData.nombre,
        cedula:     userData.cedula,
        correo:     userData.correo,
        foto_url:   userData.foto_url,
        privacidad: userData.privacidad,
        rolLabel:   info.label,
        rolColor:   info.color,
        rolIcon:    info.icon,
      });
      return true;
    } catch (err) {
      logger.error('Error en login:', err.message);
      if (err.status === 401) {
        setError(err.message || 'Credenciales incorrectas.');
      } else {
        setError('No se pudo conectar con el servidor. Verifique que el servidor esté activo.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError('');
    sessionStorage.removeItem('gestion_uq_user');
    setAuthToken(null);  // limpiar el JWT
  }, []);

  // Limpiar sesión y notificar expiración si el API responde 401/403
  useEffect(() => {
    registerSessionExpiredCallback(() => {
      logout();
      window.dispatchEvent(new CustomEvent('session-expired'));
    });
    return () => {
      registerSessionExpiredCallback(null);
    };
  }, [logout]);

  const updateUserContext = useCallback((newData) => {
    setUser(prev => prev ? { ...prev, ...newData } : null);
  }, []);

  const isAdmin = user?.rol === 'admin';
  const canEdit = user?.rol === 'admin' || user?.rol === 'tecnico' || user?.rol === 'asistente';

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, updateUserContext, isAdmin, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
