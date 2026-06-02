import React, { useMemo } from 'react';
import { TIPOS } from '../data.js';
import { SolRow } from './shared.jsx';
import { useDocentesConNuevos } from '../hooks/useDocentesData.js';
import { getSemaforo } from '../helpers.js';
import { 
  ClipboardList, UserCheck, Landmark, CheckCircle, BarChart2, Hourglass, 
  ArrowUpCircle, Users, ShieldCheck, Scale, Eye, AlertTriangle, FileText, 
  TrendingUp, GraduationCap, PlusCircle
} from 'lucide-react';

const ETAPA_LABEL = {
  clasificada:'Clasificada', pares_internos:'En Facultad', pares_externos:'En Par Ext.',
  informe:'Listo CIARP / CEI', archivada:'Archivada', resolucion:'Resolución',
};

export default function Dashboard({ user, solicitudes, onSelectSol, setNav }) {
  const { data: DOCENTES_PLANTA } = useDocentesConNuevos();

  // ── Stats solicitudes
  const solProd     = useMemo(() => solicitudes.filter(s => s.tipo !== 'ascenso'), [solicitudes]);
  const solAscenso  = useMemo(() => solicitudes.filter(s => s.tipo === 'ascenso'), [solicitudes]);

  const enProceso   = solProd.filter(s => s.estado === 'en_proceso');
  const enPares     = solProd.filter(s => ['pares_internos','pares_externos'].includes(s.etapa));
  const listosCAP   = solProd.filter(s => s.etapa === 'informe');
  const aprobados   = solProd.filter(s => s.estado === 'aprobado');

  const ascAprobados = solAscenso.filter(s => s.estado === 'aprobado');
  const ascEnProceso = solAscenso.filter(s => s.estado === 'en_proceso');
  const ascListosCEI = solAscenso.filter(s => s.etapa === 'informe');

  // ── Stats docentes
  const docenteStats = useMemo(() => ({
    total:    DOCENTES_PLANTA.length,
    enTope:   DOCENTES_PLANTA.filter(d => d.diferencia <= 0).length,
    cerca:    DOCENTES_PLANTA.filter(d => d.diferencia > 0 && d.diferencia <= 20).length,
    titulares:  DOCENTES_PLANTA.filter(d => d.categoria?.toUpperCase().includes('TITULAR')).length,
    asociados:  DOCENTES_PLANTA.filter(d => d.categoria?.toUpperCase().includes('ASOCIADO')).length,
    asistentes: DOCENTES_PLANTA.filter(d => d.categoria?.toUpperCase().includes('ASISTENTE')).length,
    auxiliares: DOCENTES_PLANTA.filter(d => d.categoria?.toUpperCase().includes('AUXILIAR')).length,
  }), [DOCENTES_PLANTA]);

  // ── Distribución por tipo de producto
  const tipoCounts = useMemo(() => {
    const counts = {};
    solProd.forEach(s => { counts[s.tipo] = (counts[s.tipo] || 0) + 1; });
    return Object.entries(counts).sort(([,a],[,b]) => b - a).slice(0, 6);
  }, [solProd]);

  // ── Alertas: pares que no han entregado con más de 30 días
  const alertas = useMemo(() => solicitudes.filter(s => {
    if (!['pares_externos','pares_internos'].includes(s.etapa)) return false;
    const pares = s.pares_ext || [];
    return pares.some(p => p.estado !== 'recibido');
  }), [solicitudes]);

  // ── Solicitudes recientes (últimas 8)
  const recientes = useMemo(() =>
    [...solicitudes].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)).slice(0, 8)
  , [solicitudes]);

  const KPI = ({ label, val, sub, color, icon, nav: n }) => (
    <div onClick={() => n && setNav(n)} style={{
      background: 'var(--surface)', border: `1px solid var(--border)`,
      borderRadius: 16, padding: '20px', cursor: n ? 'pointer' : 'default',
      transition: 'all .2s ease', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 12
    }}
      onMouseEnter={e => { if(n) { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = color; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: `${color}15`, color: color }}>
          {icon}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.02em' }}>{val}</div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontWeight: 500 }}>{sub}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1500, margin: '0 auto' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.02em' }}>
          {user.rol === 'admin' ? <Landmark size={24} color="var(--uq-green)" /> : user.rol === 'tecnico' ? <Scale size={24} color="var(--uq-blue)" /> : <Eye size={24} color="var(--muted)" />}
          {user.rol === 'admin' ? 'Panel de Administrador' : user.rol === 'tecnico' ? 'Panel Técnico' : 'Panel de Consulta'}
        </h2>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
          Oficina de Asuntos Profesorales · Universidad del Quindío · {new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>

      {/* Alerta pares pendientes */}
      {alertas.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: '#fef3c7', color: '#d97706', flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>{alertas.length} solicitudes con pares evaluadores pendientes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {alertas.slice(0, 5).map(s => (
                <button key={s.id} onClick={() => onSelectSol(s)} style={{
                  background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8,
                  padding: '4px 10px', fontSize: 12, color: '#92400e', cursor: 'pointer', fontWeight: 600, transition: 'all .2s'
                }} onMouseEnter={e => e.currentTarget.style.background = '#fde68a'} onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}>
                  {s.docente?.split(' ')[0]} {s.docente?.split(' ')[1]}
                </button>
              ))}
              {alertas.length > 5 && <span style={{ fontSize: 12, color: '#92400e', alignSelf: 'center', fontWeight: 500 }}>+{alertas.length - 5} más</span>}
            </div>
          </div>
          <button onClick={() => setNav('gestion_ciarp')} style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .2s' }} onMouseEnter={e => e.currentTarget.style.background = '#b45309'} onMouseLeave={e => e.currentTarget.style.background = '#d97706'}>
            Ir a Gestión CIARP →
          </button>
        </div>
      )}

      {/* KPIs Fila 1 - CIARP */}
      <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>Productividad CIARP</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        <KPI label="Total solicitudes 2026" val={solProd.length}   sub="todas las tipologías" color="#1a5fa8" icon={<ClipboardList size={22}/>} nav="solicitudes"/>
        <KPI label="En evaluación"    val={enPares.length}  sub="con par asignado"   color="#7c3aed" icon={<UserCheck size={22}/>} nav="gestion_ciarp"/>
        <KPI label="Listos para CIARP" val={listosCAP.length} sub="evaluación completa" color="#125b39" icon={<Landmark size={22}/>} nav="gestion_ciarp"/>
        <KPI label="Aprobados CIARP"  val={aprobados.length}  sub="con acta y puntos"  color="#15803d" icon={<CheckCircle size={22}/>} nav="resoluciones"/>
      </div>

      {/* KPIs Fila 2 - CEI */}
      <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>CEI — Ascensos en el Escalafón</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        <KPI label="Solicitudes ascenso" val={solAscenso.length} sub="proceso 2026"      color="#0369a1" icon={<BarChart2 size={22}/>} nav="cei"/>
        <KPI label="En evaluación CEI"   val={ascEnProceso.length} sub="con par o en revisión" color="#7c3aed" icon={<Hourglass size={22}/>} nav="cei"/>
        <KPI label="Listos para CEI"     val={ascListosCEI.length} sub="evaluación completa"  color="#125b39" icon={<Landmark size={22}/>} nav="cei"/>
        <KPI label="Aprobados por CEI"   val={ascAprobados.length} sub="resolución emitida"    color="#15803d" icon={<ArrowUpCircle size={22}/>} nav="cei"/>
      </div>

      {/* KPIs Fila 3 - Docentes */}
      <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>Planta Docente</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, marginBottom: 32 }}>
        <KPI label="Total planta" val={docenteStats.total}     sub="docentes activos"     color="#125b39" icon={<Users size={22}/>} nav="escalafon_hv"/>
        <KPI label="Titulares"    val={docenteStats.titulares}  sub="categoría titular"   color="#1565c0" icon={<ShieldCheck size={22}/>} nav="escalafon_hv"/>
        <KPI label="Asociados"    val={docenteStats.asociados}  sub="categoría asociado"  color="#125b39" icon={<ShieldCheck size={22}/>} nav="escalafon_hv"/>
        <KPI label="Asistentes"   val={docenteStats.asistentes} sub="categoría asistente" color="#7c3aed" icon={<ShieldCheck size={22}/>} nav="escalafon_hv"/>
        <KPI label="Auxiliares"   val={docenteStats.auxiliares} sub="categoría auxiliar"  color="#b45309" icon={<ShieldCheck size={22}/>} nav="escalafon_hv"/>
        <KPI label="En tope"      val={docenteStats.enTope}    sub="sin capacidad de pts" color="#d93025" icon={<AlertTriangle size={22}/>} nav="escalafon_hv"/>
      </div>

      {/* Contenido inferior */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

        {/* Solicitudes recientes */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
              <ClipboardList size={18} color="var(--muted)" /> Últimas solicitudes registradas
            </span>
            <button onClick={() => setNav('solicitudes')} style={{ fontSize: 12, color: 'var(--uq-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todas →</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{recientes.map(s => <SolRow key={s.id} s={s} onClick={() => onSelectSol(s)} />)}</tbody>
          </table>
        </div>

        {/* Panel derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Distribución por tipo de producto */}
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '20px 24px', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
              <BarChart2 size={18} color="var(--muted)" /> Solicitudes por tipo (2026)
            </div>
            {tipoCounts.map(([tipo, cnt]) => {
              const pct = Math.round((cnt / solProd.length) * 100);
              const t = TIPOS[tipo] || { label: tipo, icon: '📄' };
              return (
                <div key={tipo} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t.label || tipo}</span>
                    <span style={{ fontWeight: 700, color: 'var(--uq-blue)' }}>{cnt}</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--uq-blue)', borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accesos rápidos */}
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '20px 24px', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
              <FileText size={18} color="var(--muted)" /> Accesos rápidos
            </div>
            {[
              { icon: <ClipboardList size={16}/>, label: 'Solicitudes CIARP', nav: 'solicitudes', color: '#1a5fa8' },
              { icon: <Landmark size={16}/>, label: 'Gestión CIARP (CAP)', nav: 'gestion_ciarp', color: '#125b39' },
              { icon: <BarChart2 size={16}/>, label: 'Módulo CEI', nav: 'cei', color: '#0369a1' },
              { icon: <Users size={16}/>, label: 'Banco de Pares', nav: 'banco_pares', color: '#7c3aed' },
              { icon: <GraduationCap size={16}/>, label: 'Hoja de Vida Docente', nav: 'escalafon_hv', color: '#b45309' },
              { icon: <FileText size={16}/>, label: 'Resoluciones', nav: 'resoluciones', color: '#d97706' },
              { icon: <TrendingUp size={16}/>, label: 'Estadísticas', nav: 'reportes', color: '#059669' },
            ].map((m, i) => (
              <div key={i} onClick={() => setNav(m.nav)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: `${m.color}15`, color: m.color }}>
                  {m.icon}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>›</span>
              </div>
            ))}
            {user.rol !== 'lectura' && (
              <button onClick={() => setNav('nueva')} style={{
                width: '100%', marginTop: 16, padding: '12px', borderRadius: 10,
                background: 'var(--uq-green)', color: '#fff',
                border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background .2s',
              }} onMouseEnter={e => e.currentTarget.style.background = 'var(--uq-green-dk)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--uq-green)'}>
                <PlusCircle size={16} /> Nueva Solicitud CIARP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
