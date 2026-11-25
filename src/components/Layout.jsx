import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  parseSosAlertRow,
  getSeenSosIds,
  markSosIdAsSeen,
  buildSosShareWhatsappUrl,
} from '../lib/sosUtils';

const SOS_STORAGE_KEY = 'comuna_rider_sos_pos_v1';
const SOS_BTN_SIZE = 48; // w-12 h-12

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { canUseCadeteTools } = useAuth();

  const shellRef = useRef(null);
  const [shellBounds, setShellBounds] = useState({ left: 0, width: 448 });
  const [activeSosModal, setActiveSosModal] = useState(null);

  const getSafeDefaultPos = useCallback((width) => {
    const safeWidth = width || Math.min(window.innerWidth, 448);
    const safeH = typeof window !== 'undefined' ? window.innerHeight : 760;
    return {
      relX: Math.max(10, safeWidth - SOS_BTN_SIZE - 14),
      y: Math.max(72, safeH - 148),
    };
  }, []);

  const clampPos = useCallback(
    (rawPos, widthOverride) => {
      const w = widthOverride || shellBounds.width || Math.min(window.innerWidth, 448);
      const h = typeof window !== 'undefined' ? window.innerHeight : 760;
      const minRelX = 10;
      const maxRelX = Math.max(minRelX, w - SOS_BTN_SIZE - 10);
      const minY = 72; // Debajo del Header fijo (64px + margen)
      const maxY = Math.max(minY, h - 144); // Siempre arriba del BottomNav + safe-area inferior

      return {
        relX: Math.min(maxRelX, Math.max(minRelX, rawPos.relX)),
        y: Math.min(maxY, Math.max(minY, rawPos.y)),
      };
    },
    [shellBounds.width]
  );

  const [sosPos, setSosPos] = useState(() => {
    const initialWidth =
      typeof window !== 'undefined' ? Math.min(window.innerWidth, 448) : 448;
    try {
      const saved = localStorage.getItem(SOS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.relX === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Usa posición por defecto si storage falla
    }
    return getSafeDefaultPos(initialWidth);
  });

  const [isDraggingSos, setIsDraggingSos] = useState(false);
  const dragStateRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startRelX: 0,
    startY: 0,
    moved: false,
  });

  // Mantener bounds del contenedor max-w-md y reclamar posición al redimensionar
  useEffect(() => {
    const syncBounds = () => {
      if (!shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      setShellBounds({ left: rect.left, width: rect.width });
      setSosPos((prev) => clampPos(prev, rect.width));
    };

    syncBounds();
    window.addEventListener('resize', syncBounds);
    return () => window.removeEventListener('resize', syncBounds);
  }, [clampPos]);

  const isMapRoute = location.pathname === '/' || location.pathname === '/mapa';
  const hideSosButton =
    location.pathname.startsWith('/perfil') || location.pathname.startsWith('/moderador');

  const checkLatestUnseenSos = useCallback(async () => {
    if (!canUseCadeteTools || !isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('category', 'sos')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error || !data) return;
      const seenIds = getSeenSosIds();
      const firstUnseen = data
        .map(parseSosAlertRow)
        .filter(Boolean)
        .find((sos) => !seenIds.includes(sos.id));

      if (firstUnseen) {
        setActiveSosModal(firstUnseen);
      }
    } catch (err) {
      console.warn('Error verificando alertas SOS activas:', err);
    }
  }, [canUseCadeteTools]);

  useEffect(() => {
    if (!canUseCadeteTools) {
      setActiveSosModal(null);
      return;
    }

    checkLatestUnseenSos();

    const handleLocalSosEmitted = (e) => {
      const parsed = parseSosAlertRow(e.detail);
      if (!parsed) return;
      const seenIds = getSeenSosIds();
      if (!seenIds.includes(parsed.id)) {
        setActiveSosModal(parsed);
      }
    };

    const handleSosResolved = (e) => {
      const resolvedId = e.detail?.id;
      if (resolvedId) {
        markSosIdAsSeen(resolvedId);
        setActiveSosModal((prev) => (prev?.id === resolvedId ? null : prev));
      }
    };

    window.addEventListener('comuna-sos-emitted', handleLocalSosEmitted);
    window.addEventListener('comuna-sos-resolved', handleSosResolved);

    let channel = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('global:sos:popup')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            const parsed = parseSosAlertRow(payload.new);
            if (!parsed) return;
            const seenIds = getSeenSosIds();
            if (!seenIds.includes(parsed.id)) {
              setActiveSosModal(parsed);
              try {
                navigator.vibrate?.([250, 120, 250]);
              } catch {
                // Ignora si no hay soporte de vibración
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'alerts' },
          (payload) => {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setActiveSosModal((prev) => (prev?.id === deletedId ? null : prev));
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('comuna-sos-emitted', handleLocalSosEmitted);
      window.removeEventListener('comuna-sos-resolved', handleSosResolved);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [canUseCadeteTools, checkLatestUnseenSos]);

  const handleCloseSosModal = () => {
    if (activeSosModal?.id) {
      markSosIdAsSeen(activeSosModal.id);
    }
    setActiveSosModal(null);
  };

  const triggerOpenSos = useCallback(() => {
    if (isMapRoute) {
      window.dispatchEvent(new CustomEvent('comuna-open-sos'));
    } else {
      navigate('/', { state: { openSos: Date.now() } });
    }
  }, [isMapRoute, navigate]);

  const handleSosPointerDown = (e) => {
    e.preventDefault();
    const current = clampPos(sosPos);
    dragStateRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRelX: current.relX,
      startY: current.y,
      moved: false,
    };
    setIsDraggingSos(true);
  };

  useEffect(() => {
    if (!isDraggingSos) return;

    const handlePointerMove = (e) => {
      if (!dragStateRef.current.active) return;
      const dx = e.clientX - dragStateRef.current.startClientX;
      const dy = e.clientY - dragStateRef.current.startClientY;
      if (Math.hypot(dx, dy) > 6) {
        dragStateRef.current.moved = true;
      }
      const next = clampPos({
        relX: dragStateRef.current.startRelX + dx,
        y: dragStateRef.current.startY + dy,
      });
      setSosPos(next);
    };

    const handlePointerUp = () => {
      if (!dragStateRef.current.active) return;
      const wasMoved = dragStateRef.current.moved;
      dragStateRef.current.active = false;
      setIsDraggingSos(false);

      if (wasMoved) {
        setSosPos((latest) => {
          const finalPos = clampPos(latest);
          try {
            localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(finalPos));
          } catch {
            // Ignora error de storage
          }
          return finalPos;
        });
      } else {
        triggerOpenSos();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDraggingSos, clampPos, triggerOpenSos]);

  const getScreenTitle = (path) => {
    switch (path) {
      case '/':
      case '/mapa':
        return 'Mapa Jujuy';
      case '/turnos':
        return 'Turnos';
      case '/novedades':
      case '/noticias':
        return 'Novedades';
      case '/directorio':
        return 'Mulitas Emprendedoras';
      case '/perfil':
        return 'Mi Perfil';
      case '/moderador':
        return 'Moderador';
      default:
        return 'Cadetes Jujuy';
    }
  };

  const renderedPos = clampPos(sosPos);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center">
      {/* Mobile Shell Wrapper (max-w-md) */}
      <div
        ref={shellRef}
        className="w-full max-w-md min-h-screen bg-surface relative flex flex-col shadow-xl"
      >
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

        {/* Botón circular SOS arrastrable libremente (Todas las páginas salvo Perfil y Moderador, Nivel 2+) */}
        {canUseCadeteTools && !hideSosButton && (
          <button
            id="btn-global-sos"
            type="button"
            onPointerDown={handleSosPointerDown}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerOpenSos();
              }
            }}
            title="Tocá para SOS • Mantené y arrastrá para mover"
            style={{
              left: `${shellBounds.left + renderedPos.relX}px`,
              top: `${renderedPos.y}px`,
            }}
            className={`fixed z-[60] w-12 h-12 rounded-full bg-error text-on-error flex items-center justify-center shadow-[0_6px_18px_rgba(220,38,38,0.5)] border-2 border-white touch-none select-none ${
              isDraggingSos
                ? 'scale-110 cursor-grabbing ring-4 ring-error/30'
                : 'cursor-grab active:scale-95 transition-transform'
            }`}
          >
            <span className="font-label-md text-xs font-black tracking-wider leading-none pointer-events-none">
              SOS
            </span>
          </button>
        )}

        <BottomNav />
      </div>

      {/* VENTANA EMERGENTE SOS POR ÚNICA VEZ SUPERPUESTA A TODO (Exclusivo Nivel 2+) */}
      {canUseCadeteTools && activeSosModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl border-2 border-error animate-in zoom-in-95 duration-150">
            <div className="bg-error text-on-error px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <span className="material-symbols-outlined text-2xl">emergency</span>
                </div>
                <div className="min-w-0">
                  <span className="font-label-sm text-[10px] uppercase tracking-wider font-black block opacity-90">
                    Alerta SOS en Vivo • Nivel 2+
                  </span>
                  <h2 className="font-headline-md text-headline-md font-extrabold leading-tight truncate">
                    {activeSosModal.badge}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSosModal}
                aria-label="Cerrar alerta SOS"
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="space-y-1">
                <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                  {activeSosModal.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface/90 bg-error-container/30 p-3 rounded-xl border border-error/25">
                  {activeSosModal.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-secondary font-semibold">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low">
                  <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                  {activeSosModal.zone}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low">
                  <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                  {activeSosModal.time}
                </span>
                {activeSosModal.phone && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-container/15 text-tertiary font-bold">
                    <span className="material-symbols-outlined text-sm">call</span>
                    {activeSosModal.phone}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const coords = [activeSosModal.lat, activeSosModal.lng];
                    handleCloseSosModal();
                    navigate('/', { state: { focusSosCoords: coords } });
                  }}
                  className="h-11 rounded-xl bg-primary-container text-on-primary-container font-label-md text-xs font-extrabold flex items-center justify-center gap-1 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">map</span>
                  Ver en Mapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseSosModal();
                    navigate('/novedades');
                  }}
                  className="h-11 rounded-xl bg-surface-container text-on-surface font-label-md text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">newspaper</span>
                  Ver en Novedades
                </button>
              </div>

              <div className="flex gap-2">
                <a
                  href={buildSosShareWhatsappUrl(activeSosModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-11 rounded-xl bg-tertiary-container text-on-tertiary-container font-label-md text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">chat</span>
                  Pasar por WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleCloseSosModal}
                  className="px-6 h-11 rounded-xl bg-on-surface text-surface font-label-md text-xs font-extrabold active:scale-95"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
