import React, { useState } from 'react';
import { 
  Home, GraduationCap, Users, ClipboardList, PlusCircle, 
  Landmark, FileText, TrendingUp, BarChart2, Scale, Eye, LogOut, Award 
} from 'lucide-react';

const ALL_LINKS = [
  { id: 'dashboard',    label: 'Inicio',               icon: <Home size={18} />, section: null },
  // GESTIÓN
  { id: 'docentes',     label: 'Docentes & Hoja de Vida', icon: <GraduationCap size={18} />, section: 'GESTIÓN' },
  { id: 'banco_pares',  label: 'Banco de Pares',        icon: <Users size={18} />, section: null },
  // PRODUCTIVIDAD CIARP
  { id: 'solicitudes',  label: 'Solicitudes CIARP',     icon: <ClipboardList size={18} />, section: 'PRODUCTIVIDAD' },
  { id: 'reconocimientos', label: 'Reconocimientos (DAA·DDD)', icon: <Award size={18} />, section: null },
  { id: 'nueva',        label: 'Nueva Solicitud',       icon: <PlusCircle size={18} />, section: null, soloAdmin: true },
  { id: 'gestion_ciarp',label: 'Gestión CIARP (CAP)',   icon: <Landmark size={18} />, section: null },
  { id: 'resoluciones', label: 'Resoluciones',          icon: <FileText size={18} />, section: null },
  // ESCALAFÓN CEI
  { id: 'cei',          label: 'Módulo CEI',            icon: <Landmark size={18} />, section: 'ESCALAFÓN CEI' },
  // ANÁLISIS
  { id: 'reportes',     label: 'Estadísticas',          icon: <TrendingUp size={18} />, section: 'ANÁLISIS' },
  { id: 'historico',    label: 'Histórico 1994-2025',   icon: <BarChart2 size={18} />, section: null },
];

const ROL_META = {
  admin:   { bg: 'linear-gradient(180deg,#125b39 0%,#0d422a 100%)', label: 'Administrador',      emoji: <Landmark size={20} /> },
  tecnico: { bg: 'linear-gradient(180deg,#0d3d6e 0%,#1a5fa8 100%)', label: 'Técnico Evaluador',  emoji: <Scale size={20} /> },
  lectura: { bg: 'linear-gradient(180deg,#2c2c2c 0%,#1d1d1f 100%)', label: 'Solo Lectura',       emoji: <Eye size={20} /> },
};

const HIDDEN_LECTURA = ['nueva','gestion_ciarp','resoluciones'];

export default function Shell({ user, onLogout, nav, setNav, children }) {
  const [collapsed, setCollapsed] = useState(true);
  const meta = ROL_META[user?.rol] || ROL_META.lectura;

  const visible = ALL_LINKS.filter(l => {
    if (l.soloAdmin && user?.rol !== 'admin') return false;
    if (user?.rol === 'lectura' && HIDDEN_LECTURA.includes(l.id)) return false;
    return true;
  });

  let lastSection = '__none__';

  return (
    <div className="shell-layout">
      {/* SIDEBAR */}
      <aside
        className={`sidebar${collapsed ? ' collapsed' : ''}`}
        style={{ background: meta.bg }}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">{meta.emoji}</div>
          <div className="sidebar-brand">
            <div className="sidebar-brand-top">Universidad del Quindío</div>
            <div className="sidebar-brand-name">Asuntos Profesorales</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {visible.map(l => {
            const showSep = l.section && l.section !== lastSection;
            if (showSep) lastSection = l.section;
            const isActive = nav === l.id;
            return (
              <React.Fragment key={l.id}>
                {showSep && (
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: 1.2,
                    color: 'rgba(255,255,255,.4)', padding: '14px 16px 4px',
                    textTransform: 'uppercase', userSelect: 'none',
                  }}>{l.section}</div>
                )}
                <div
                  className={`sidebar-item${isActive ? ' active' : ''}`}
                  onClick={() => setNav(l.id)}
                  role="button"
                  aria-current={isActive ? 'page' : undefined}
                  title={l.label}
                >
                  <span className="sidebar-item-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {l.icon}
                  </span>
                  <span className="sidebar-item-label">{l.label}</span>
                  {isActive && !collapsed && (
                    <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer usuario */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ color: '#fff' }}>{meta.emoji}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-role">{meta.label}</div>
              <div className="sidebar-user-name" title={user?.nombre}>{user?.nombre}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={onLogout}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={16} /></span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-area">
        {children}
      </main>
    </div>
  );
}
