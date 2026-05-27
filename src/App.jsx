import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuth }           from './context/AuthContext';
import { useSolicitudes }    from './context/SolicitudesContext';
import { useNotification }   from './context/NotificationContext';
import ErrorBoundary         from './components/ErrorBoundary';
import LoadingSkeleton       from './components/LoadingSkeleton';
import Login                 from './components/Login.jsx';
import Shell                 from './components/Shell.jsx';
import TopBar                from './components/TopBar.jsx';
import WelcomeToast          from './components/WelcomeToast.jsx';
import { 
  Home, ClipboardList, PlusCircle, Landmark, FileText, 
  TrendingUp, Search, GraduationCap, Users, BarChart2, Award 
} from 'lucide-react';

// ── Lazy loading — páginas pesadas se cargan bajo demanda [P5] ──
const Dashboard            = lazy(() => import('./components/Dashboard.jsx'));
const ListaSolicitudes     = lazy(() => import('./components/ListaSolicitudes.jsx'));
const NuevaSolicitud       = lazy(() => import('./components/NuevaSolicitud.jsx'));
const DetalleSolicitud     = lazy(() => import('./components/DetalleSolicitud.jsx'));
const Reportes             = lazy(() => import('./components/Reportes.jsx'));
const GestorCiarp          = lazy(() => import('./components/GestorCiarp.jsx'));
const Resoluciones         = lazy(() => import('./components/Resoluciones.jsx'));
const GestorDocentes       = lazy(() => import('./components/GestorDocentes.jsx'));
const ModuloCEI            = lazy(() => import('./components/ModuloCEI.jsx'));
const BancoPares           = lazy(() => import('./components/BancoPares.jsx'));
const ProductividadHistorica = lazy(() => import('./components/ProductividadHistorica.jsx'));
const ModuloReconocimientos  = lazy(() => import('./components/ModuloReconocimientos.jsx'));
const PortalParEvaluador   = lazy(() => import('./components/PortalParEvaluador.jsx'));
const PortalDocente        = lazy(() => import('./components/PortalDocente.jsx'));
const RastreoSolicitud     = lazy(() => import('./components/RastreoSolicitud.jsx'));

// ── Metadatos de páginas ──────────────────────────────────────
const PAGE_TITLES = {
  dashboard:     { title: 'Panel Principal',          icon: <Home size={18} /> },
  solicitudes:   { title: 'Solicitudes CIARP',        icon: <ClipboardList size={18} /> },
  nueva:         { title: 'Nueva Solicitud',           icon: <PlusCircle size={18} /> },
  gestion_ciarp: { title: 'Gestión CIARP',            icon: <Landmark size={18} /> },
  resoluciones:  { title: 'Resoluciones',             icon: <FileText size={18} /> },
  reportes:      { title: 'Estadísticas',             icon: <TrendingUp size={18} /> },
  detalle:       { title: 'Detalle de Solicitud',     icon: <Search size={18} /> },
  escalafon_hv:  { title: 'Hoja de Vida Docente',     icon: <GraduationCap size={18} /> },
  docentes:      { title: 'Docentes & Hoja de Vida',  icon: <GraduationCap size={18} /> },
  banco_pares:   { title: 'Banco de Pares',           icon: <Users size={18} /> },
  cei:           { title: 'Módulo CEI — Escalafón',   icon: <Landmark size={18} /> },
  historico:         { title: 'Productividad Histórica',        icon: <BarChart2 size={18} /> },
  reconocimientos:   { title: 'Reconocimientos Anuales (DAA·DDD·Exp.)', icon: <Award size={18} /> },
};

/** Spinner de carga para Suspense */
function PageLoader() {
  return (
    <div style={{ padding: 40 }}>
      <LoadingSkeleton rows={6} />
    </div>
  );
}

export default function App() {
  const { user, logout } = useAuth();
  const {
    solicitudes, solicitudesProductividad, solicitudesAscenso,
    crear, actualizar, eliminar,
  } = useSolicitudes();
  const { success, error: showError } = useNotification();

  const [nav,         setNav]         = useState('dashboard');
  const [selectedSol, setSelectedSol] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Toast de bienvenida 4.5 s tras login
  useEffect(() => {
    if (user) {
      setShowWelcome(true);
      const t = setTimeout(() => setShowWelcome(false), 4500);
      return () => clearTimeout(t);
    }
  }, [user]);

  // Escuchar expiración de sesión (JWT)
  useEffect(() => {
    const handleSessionExpired = () => {
      showError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [showError]);

  // ── Handlers ─────────────────────────────────────────────
  const handleSelect = (s) => { setSelectedSol(s); setNav('detalle'); };

  const handleUpdate = async (s) => {
    setSelectedSol(s);
    const result = await actualizar(s);
    if (result.success) {
      setSelectedSol(result.sol);
      success('Solicitud guardada en servidor local');
    } else {
      showError('No se pudo guardar en el servidor. Inténtelo de nuevo.');
    }
  };

  const handleEliminar = async (id) => {
    const result = await eliminar(id);
    if (result?.success) {
      success('Solicitud eliminada');
      setNav(backFromDetalle);
      setSelectedSol(null);
    } else {
      showError('No se pudo eliminar. Verifica la conexión.');
    }
  };

  const backFromDetalle = selectedSol?.tipo === 'ascenso' ? 'cei' : 'solicitudes';

  // ── Portales públicos (sin login) ────────────────────────
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get('portal_par')) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PortalParEvaluador />
      </Suspense>
    );
  }

  if (urlParams.get('rastreo')) {
    return (
      <Suspense fallback={<PageLoader />}>
        <RastreoSolicitud />
      </Suspense>
    );
  }

  if (!user) return <Login />;

  // ── Vista exclusiva para docentes ────────────────────────
  if (user.rol === 'docente') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <PortalDocente user={user} onLogout={logout} />
        </Suspense>
        <WelcomeToast show={showWelcome} user={user} />
      </ErrorBoundary>
    );
  }

  const currentPage = PAGE_TITLES[nav] || PAGE_TITLES.dashboard;

  // Wrapper: ErrorBoundary + TopBar + Suspense para cada página
  const W = (C, props = {}) => (
    <ErrorBoundary>
      <TopBar currentPage={currentPage} />
      <Suspense fallback={<PageLoader />}>
        <C {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  const renderPage = () => {
    switch (nav) {
      case 'dashboard':
        return W(Dashboard, { user, solicitudes, onSelectSol: handleSelect, setNav });

      case 'solicitudes':
        return W(ListaSolicitudes, { user, solicitudes: solicitudesProductividad, onSelect: handleSelect, setNav });

      case 'nueva':
        return W(NuevaSolicitud, {
          onSave: async (s) => {
            const result = await crear(s);
            if (result.success) success('Solicitud guardada en servidor local');
            else showError('No se pudo guardar en el servidor. Verifica la conexión.');
            setNav('solicitudes');
          },
          onCancel: () => setNav('solicitudes'),
          solicitudesExistentes: solicitudes,
        });

      case 'gestion_ciarp':
        return W(GestorCiarp, { user, solicitudes: solicitudesProductividad, onSelect: handleSelect, setNav });

      case 'resoluciones':
        return W(Resoluciones, { solicitudes: solicitudesProductividad, onSelect: handleSelect });

      case 'reportes':
        return W(Reportes, { solicitudes });

      case 'escalafon_hv':
      case 'docentes':
        return W(GestorDocentes, { user, setNav });

      case 'banco_pares':
        return W(BancoPares, { solicitudes });

      case 'cei':
        return W(ModuloCEI, { user, solicitudesAscenso, onSelect: handleSelect });

      case 'historico':
        return W(ProductividadHistorica, { user });

      case 'reconocimientos':
        return W(ModuloReconocimientos, { user });

      case 'detalle':
        return selectedSol ? (
          <ErrorBoundary>
            <TopBar currentPage={currentPage} />
            <Suspense fallback={<PageLoader />}>
              <DetalleSolicitud
                sol={selectedSol}
                user={user}
                onBack={() => setNav(backFromDetalle)}
                onUpdate={handleUpdate}
                onEliminar={handleEliminar}
              />
            </Suspense>
          </ErrorBoundary>
        ) : null;

      default:
        return W(Dashboard, { user, solicitudes, onSelectSol: handleSelect, setNav });
    }
  };

  return (
    <>
      <Shell user={user} onLogout={logout} nav={nav} setNav={setNav}>
        <main id="main-content">
          {renderPage()}
        </main>
      </Shell>
      <WelcomeToast show={showWelcome} user={user} />
    </>
  );
}
