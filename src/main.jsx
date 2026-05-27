import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider }          from './context/AuthContext';
import { SolicitudesProvider }   from './context/SolicitudesContext';
import { NotificationProvider }  from './context/NotificationContext';
import ToastContainer            from './components/ToastContainer';
import ConnectionStatus          from './components/ConnectionStatus';
import ErrorBoundary             from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <SolicitudesProvider>
            <App />
            <ToastContainer />
            <ConnectionStatus />
          </SolicitudesProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
