import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const { canUseCadeteTools, isAdmin } = useAuth();

  const navItems = canUseCadeteTools
    ? [
        {
          to: '/',
          label: 'Mapa Jujuy',
          icon: 'near_me',
          badge: null,
        },
        {
          to: '/turnos',
          label: 'Turnos',
          icon: 'calendar_clock',
          badge: '3',
        },
        {
          to: '/calculadora',
          label: 'Calculadora',
          icon: 'calculate',
          badge: null,
        },
        {
          to: '/directorio',
          label: 'Directorio',
          icon: 'handyman',
          badge: null,
        },
        ...(isAdmin
          ? [
              {
                to: '/perfil',
                label: 'Moderador',
                icon: 'admin_panel_settings',
                badge: null,
              },
            ]
          : []),
      ]
    : [
        {
          to: '/',
          label: 'Mapa Jujuy',
          icon: 'near_me',
          badge: null,
        },
        {
          to: '/directorio',
          label: 'Directorio',
          icon: 'handyman',
          badge: null,
        },
        {
          to: '/perfil',
          label: 'Soy Cadete',
          icon: 'verified_user',
          badge: null,
        },
      ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/95 backdrop-blur-xl border-t border-surface-container shadow-[0_-2px_12px_rgba(21,28,39,0.06)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-space-xs">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center flex-1 h-full transition-colors min-w-[44px] min-h-[44px] select-none ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-2xl transition-transform active:scale-90"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-label-sm text-label-sm mt-0.5 tracking-tight">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="absolute top-2 right-1/4 -mr-1 px-1 min-w-[16px] h-4 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm flex items-center justify-center font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
