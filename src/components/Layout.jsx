import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { canUseCadeteTools } = useAuth();

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
      case '/perfil':
        return 'Mi Perfil';
      default:
        return 'Cadetes Jujuy';
    }
  };

  const isMapRoute = location.pathname === '/' || location.pathname === '/mapa';
  const isProfileRoute = location.pathname.startsWith('/perfil');

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center">
      {/* Mobile Shell Wrapper (max-w-md) */}
      <div className="w-full max-w-md min-h-screen bg-surface relative flex flex-col shadow-xl">
        <Header title={getScreenTitle(location.pathname)} />

        <main
          className={
            isMapRoute
              ? 'relative flex-1 w-full pt-16 pb-16 overflow-hidden bg-surface'
              : 'flex-1 w-full pt-16 pb-24 px-space-md bg-surface'
          }
        >
          <Outlet />
        </main>

        {/* Botón circular SOS en todas las páginas (salvo Mapa que ya lo incluye y Perfil) */}
        {canUseCadeteTools && !isMapRoute && !isProfileRoute && (
          <aside className="fixed max-w-md w-full bottom-20 px-4 pointer-events-none z-40 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/', { state: { openSos: true } })}
              title="Pedir Auxilio SOS"
              className="pointer-events-auto w-12 h-12 rounded-full bg-error text-on-error flex items-center justify-center shadow-[0_6px_18px_rgba(220,38,38,0.5)] border-2 border-white active:scale-95 transition-transform cursor-pointer flex-shrink-0"
            >
              <span className="font-label-md text-xs font-black tracking-wider leading-none">
                SOS
              </span>
            </button>
          </aside>
        )}

        <BottomNav />
      </div>
    </div>
  );
}
