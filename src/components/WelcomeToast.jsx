import { ROL_COLORS } from '../data';

function getInitials(nombre = '') {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

/**
 * Toast de bienvenida que aparece 4.5 s después del login.
 * Props:
 *   show  — boolean — controlado por App
 *   user  — objeto de usuario (nombre, rol)
 */
export default function WelcomeToast({ show, user }) {
  if (!show || !user) return null;

  const rc      = ROL_COLORS[user.rol] || ROL_COLORS.lectura;
  const initials = getInitials(user.nombre);
  const hora    = new Date().getHours();
  const saludo  = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: '#fff', border: `2px solid ${rc.bg}`,
      borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,.18)',
      padding: '16px 22px 16px 18px', display: 'flex', alignItems: 'center', gap: 14,
      animation: 'fadeUp .35s ease both', maxWidth: 340,
      borderLeft: `6px solid ${rc.bg}`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: rc.bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, flexShrink: 0,
      }}>{initials}</div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
          {saludo}, {user.nombre.split(' ')[0]}! 👋
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
          Ingresaste como <strong style={{ color: rc.bg }}>{rc.label}</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
          Universidad del Quindío · Asuntos Profesorales
        </div>
      </div>
    </div>
  );
}
