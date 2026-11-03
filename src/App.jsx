import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import MapaPage from './pages/MapaPage';
import TurnosPage from './pages/TurnosPage';
import CalculadoraPage from './pages/CalculadoraPage';
import DirectorioPage from './pages/DirectorioPage';
import PerfilPage from './pages/PerfilPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MapaPage />} />
            <Route path="mapa" element={<Navigate to="/" replace />} />
            <Route path="turnos" element={<TurnosPage />} />
            <Route path="calculadora" element={<CalculadoraPage />} />
            <Route path="directorio" element={<DirectorioPage />} />
            <Route path="perfil" element={<PerfilPage />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
