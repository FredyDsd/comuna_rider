import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import MapaPage from './pages/MapaPage';
import TurnosPage from './pages/TurnosPage';
import NoticiasPage from './pages/NoticiasPage';
import DirectorioPage from './pages/DirectorioPage';
import PerfilPage from './pages/PerfilPage';

function CadeteOnlyRoute({ children }) {
  const { canUseCadeteTools, loading } = useAuth();
  if (loading) return null;
  if (!canUseCadeteTools) {
    return <Navigate to="/perfil" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MapaPage />} />
            <Route path="mapa" element={<Navigate to="/" replace />} />
            <Route
              path="turnos"
              element={
                <CadeteOnlyRoute>
                  <TurnosPage />
                </CadeteOnlyRoute>
              }
            />
            <Route
              path="novedades"
              element={
                <CadeteOnlyRoute>
                  <NoticiasPage />
                </CadeteOnlyRoute>
              }
            />
            <Route path="noticias" element={<Navigate to="/novedades" replace />} />
            <Route path="calculadora" element={<Navigate to="/novedades" replace />} />
            <Route
              path="directorio"
              element={
                <CadeteOnlyRoute>
                  <DirectorioPage />
                </CadeteOnlyRoute>
              }
            />
            <Route path="perfil" element={<PerfilPage />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
