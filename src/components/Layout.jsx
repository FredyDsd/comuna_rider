import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, canUseCadeteTools } = useAuth();

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

  const handleSosAuxilio = async () => {
    if (!canUseCadeteTools || !user) {
      navigate('/perfil');
      return;
    }

    const cadeteName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Jujuy';
    const zone = profile?.zone || 'Centro';

    if (isSupabaseConfigured) {
      await supabase.from('alerts').insert({
        user_id: user.id,
        author_name: cadeteName,
        vehicle: profile?.vehicle || 'Moto',
        type: 'sos',
        category: 'gruas',
        badge: '🚨 SOS AUXILIO EN RUTA',
        title: `Auxilio Mecánico / Emergencia en ${zone}`,
        description: `El compañero ${cadeteName} (${profile?.vehicle || 'Moto'}) solicita asistencia en ${zone}.`,
        zone,
        confirm_count: 1,
        verified: true,
      });
    }

    alert(`🚨 Alerta SOS enviada al radar comunitario de Jujuy con tu ID (${cadeteName}).`);
    navigate('/');
  };

  const isMapRoute = location.pathname === '/' || location.pathname === '/mapa';

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

        {/* Botón flotante SOS Auxilio (Exclusivo para Cadetes Verificados Nivel 2+) */}
        {canUseCadeteTools && !isMapRoute && (
          <aside className="fixed max-w-md w-full bottom-20 px-4 pointer-events-none z-40 flex justify-end">
            <button
              type="button"
              onClick={handleSosAuxilio}
              className="pointer-events-auto flex items-center gap-1.5 px-4 h-11 bg-primary-container text-on-primary-container rounded-full shadow-[0_8px_20px_rgba(234,0,41,0.38)] active:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg animate-pulse">emergency</span>
              <span className="font-label-md text-label-md tracking-wider uppercase font-black text-xs">
                SOS Auxilio
              </span>
            </button>
          </aside>
        )}

        <BottomNav />
      </div>
    </div>
  );
}
