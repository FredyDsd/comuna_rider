import React from 'react';

export default function Header({ title = 'Cadetes Jujuy' }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-primary-container text-on-primary-container pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.08)]">
      <div className="h-16 px-space-md flex items-center justify-between gap-space-sm max-w-md mx-auto">
        <div className="flex items-center gap-space-sm min-w-0">
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
              <span className="font-body-sm text-body-sm truncate">San Salvador de Jujuy</span>
              <span className="material-symbols-outlined text-xs leading-none">expand_more</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-label-sm font-extrabold uppercase text-on-primary-container/90">
              {title}
            </span>
            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-tertiary-fixed">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-pulse"></span>
              Online
            </span>
          </div>
          <div className="relative flex items-center justify-center p-0.5 rounded-full ring-2 ring-on-primary-container/30">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-bold text-xs uppercase">
              CR
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
