import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ title = 'Cadetes Jujuy' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, roleInfo, canUseCadeteTools } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'CR';

  const isOnline = !user || profile?.status !== 'paused';
  const isOnProfile = location.pathname === '/perfil';
  const isPendingVerification = profile?.verification_status === 'pending' && !canUseCadeteTools;
  const safeTitle =
    !canUseCadeteTools && (title === 'Turnos' || title === 'Novedades')
      ? 'Comuna Jujuy'
      : title;

  return (
    <header className="fixed top-0 w-full z-50 bg-primary-container text-on-primary-container pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.08)]">
      <div className="h-16 px-space-md flex items-center justify-between gap-space-sm max-w-md mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-space-sm min-w-0 text-left"
        >
          <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-primary text-2xl font-bold">two_wheeler</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-label-lg text-label-lg tracking-tight truncate">Cadetes Jujuy</span>
              <span className="px-1.5 py-0.5 rounded-full bg-on-primary-container/20 font-label-sm text-label-sm uppercase tracking-wider font-extrabold flex-shrink-0">
                SSJ
              </span>
            </div>
            <div className="flex items-center gap-1 text-on-primary-container/90">
              <span className="material-symbols-outlined text-xs leading-none">location_on</span>
              <span className="font-body-sm text-body-sm truncate">
                {profile?.zone ? `${profile.zone} • Jujuy` : 'San Salvador de Jujuy'}
              </span>
              <span className="material-symbols-outlined text-xs leading-none">expand_more</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-space-sm flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-label-sm font-extrabold uppercase text-on-primary-container/90">
              {safeTitle}
            </span>
            {user ? (
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-tertiary-fixed">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPendingVerification
                      ? 'bg-amber-300 animate-pulse'
                      : isOnline
                      ? 'bg-tertiary-fixed animate-pulse'
                      : 'bg-amber-300'
                  }`}
                ></span>
                {isPendingVerification
                  ? '⏳ Verificación Pendiente'
                  : canUseCadeteTools
                  ? isOnline
                    ? `Nivel ${roleInfo.level} • ${roleInfo.name}`
                    : 'En Pausa'
                  : 'Nivel 1 • Ciudadano'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-primary-container/80">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60"></span>
                Ciudadano (N1)
              </span>
            )}
          </div>

          <button
            type="button"
            id="btn-header-profile"
            title="Mi Perfil y Estado del Cadete"
            onClick={() => navigate('/perfil')}
            className={`relative flex items-center justify-center p-0.5 rounded-full ring-2 transition-transform active:scale-95 ${
              isOnProfile ? 'ring-tertiary-fixed scale-105' : 'ring-on-primary-container/40'
            }`}
          >
            {profile?.avatar_url ? (
              <img
                alt="Mi Perfil"
                className="w-8 h-8 rounded-full object-cover"
                src={profile.avatar_url}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-bold text-xs uppercase">
                {user ? initials : <span className="material-symbols-outlined text-base text-primary">person</span>}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
