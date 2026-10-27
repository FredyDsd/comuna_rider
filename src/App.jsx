import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MapaPage from './pages/MapaPage';
import TurnosPage from './pages/TurnosPage';
import CalculadoraPage from './pages/CalculadoraPage';
import DirectorioPage from './pages/DirectorioPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MapaPage />} />
          <Route path="mapa" element={<Navigate to="/" replace />} />
          <Route path="turnos" element={<TurnosPage />} />
          <Route path="calculadora" element={<CalculadoraPage />} />
          <Route path="directorio" element={<DirectorioPage />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
