import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';

const SOS_STORAGE_KEY = 'comuna_rider_sos_pos_v1';
const SOS_BTN_SIZE = 48; // w-12 h-12

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { canUseCadeteTools } = useAuth();

  const shellRef = useRef(null);
  const [shellBounds, setShellBounds] = useState({ left: 0, width: 448 });

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
  const isProfileRoute = location.pathname.startsWith('/perfil');

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
      case '/calculadora':
        return 'Calculadora';
      case '/directorio':
        return 'Mulitas Emprendedoras';
      case '/perfil':
        return 'Mi Perfil';
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

        {/* Botón circular SOS arrastrable libremente (Todas las páginas salvo Perfil, Nivel 2+) */}
        {canUseCadeteTools && !isProfileRoute && (
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
    </div>
  );
}
