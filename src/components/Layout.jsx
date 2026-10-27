import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();

  const getScreenTitle = (path) => {
    switch (path) {
      case '/':
      case '/mapa':
        return 'Mapa Jujuy';
      case '/turnos':
        return 'Turnos';
      case '/calculadora':
        return 'Calculadora';
      case '/directorio':
        return 'Directorio';
      default:
        return 'Cadetes Jujuy';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center">
      {/* Mobile Shell Wrapper (max-w-md) */}
      <div className="w-full max-w-md min-h-screen bg-surface relative flex flex-col shadow-xl">
        <Header title={getScreenTitle(location.pathname)} />

        <main className="flex-1 w-full pt-16 pb-24 px-space-md bg-surface">
          <Outlet />
        </main>

        {/* Floating SOS Auxilio Button */}
        <aside className="fixed max-w-md w-full bottom-20 px-4 pointer-events-none z-40 flex justify-end">
          <button
            type="button"
            onClick={() => alert('🚨 SOS Auxilio activado: en Fase 3 enviará coordenadas GPS al grupo de cadetes.')}
            className="pointer-events-auto flex items-center gap-1.5 px-4 h-11 bg-primary-container text-on-primary-container rounded-full shadow-[0_8px_20px_rgba(234,0,41,0.38)] active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg animate-pulse">emergency</span>
            <span className="font-label-md text-label-md tracking-wider uppercase font-black text-xs">
              SOS Auxilio
            </span>
          </button>
        </aside>

        <BottomNav />
      </div>
    </div>
  );
}
