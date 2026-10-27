import React, { useState } from 'react';

export default function MapaPage() {
  const [selectedZone, setSelectedZone] = useState('Centro');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'critical',
      badge: 'Crítica • Tránsito y Grúa',
      time: 'Hace 12 min',
      title: 'Rotonda Chango Más / Acceso Sur',
      desc: 'Operativo fuerte y grúa municipal activa. Pidiendo estrictamente seguro al día, casco reglamentario y VTV. Reportado por Nico R. (Moto).',
      confirmCount: 14,
      verified: true,
      category: 'gruas',
    },
    {
      id: 2,
      type: 'warning',
      badge: 'Operativo Vial',
      time: 'Hace 18 min',
      title: 'Cerro Las Rosas / Av. Párroco Marske',
      desc: 'Inspección de luces delanteras/traseras e indumentaria refractaria a cadetes que bajan hacia el sur. Sin retenciones por ahora.',
      confirmCount: 8,
      verified: false,
      author: 'Cadete: Franco L.',
      category: 'gruas',
    },
    {
      id: 3,
      type: 'weather',
      badge: 'Vía Intransitable',
      time: 'Hace 22 min',
      title: 'Colectora Suipacha / Chijra (Badén)',
      desc: 'Badén crecido con arrastre de barro por lluvia en la cuenca alta. No meter moto chica ni bicicleta. Desvío sugerido por Puente Senador Pérez.',
      confirmCount: 21,
      verified: false,
      extra: 'Desvío +4 min',
      category: 'lluvia',
    },
    {
      id: 4,
      type: 'security',
      badge: 'Alerta Seguridad / Cliente',
      time: 'Hace 31 min',
      title: 'Barrio Cuyaya (Calle Olavarría alt. 400)',
      desc: 'Usuario con cuenta nueva haciendo pedidos reiterados con pago en efectivo falso / intenta cobrar vuelto antes de recibir. Cobren antes de soltar la mochila.',
      confirmCount: 19,
      verified: false,
      author: 'Comunidad Cadetes SSJ',
      category: 'cuponeros',
    },
  ]);

  const [confirmedAlerts, setConfirmedAlerts] = useState({});

  const zones = ['Centro', 'Alto Comedero', 'Nueva Terminal', 'Cuyaya', 'Chijra', 'Los Perales', 'Palpalá'];

  const handleConfirm = (id) => {
    if (confirmedAlerts[id]) return;
    setConfirmedAlerts((prev) => ({ ...prev, [id]: true }));
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, confirmCount: a.confirmCount + 1 } : a))
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.category === activeFilter;
  });

  return (
    <div className="flex flex-col w-full pb-6 space-y-space-md pt-2">
      {/* Sub-banner Contextual / Barra de Estado Operativa */}
      <div className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary-container p-space-md shadow-md">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col space-y-space-sm">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping"></span>
              <span className="font-label-sm text-label-sm text-on-primary-container tracking-wider uppercase font-extrabold">
                Radar Comunitario SSJ
              </span>
            </div>
            <div className="flex items-center gap-1 text-on-primary-container/90">
              <span className="material-symbols-outlined text-sm">wifi_tethering</span>
              <span className="font-label-sm text-label-sm">En Vivo</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm text-on-primary-container/80">
              Zona de Operación Actual
            </span>
            {/* Selector interactivo de Zona Pills en Scroll Horizontal */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5">
              {zones.map((zone) => {
                const isSelected = selectedZone === zone;
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors flex items-center gap-1 ${
                      isSelected
                        ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                        : 'bg-white/15 text-on-primary-container hover:bg-white/25'
                    }`}
                  >
                    {isSelected && (
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        my_location
                      </span>
                    )}
                    {zone}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Widget de Clima y Tarifa Dinámica en Jujuy */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-2xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              rainy
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-label-lg text-label-lg text-on-surface truncate">
                Llovizna Ligera • 19°C
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-extrabold flex-shrink-0">
                +25% TARIFA
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary truncate">
              Demanda alta en {selectedZone} y alrededores
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="font-headline-md text-headline-md text-primary font-black tracking-tight">
            +$480
          </span>
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
            x Pedido
          </span>
        </div>
      </div>

      {/* Vista previa de Mapa Georreferenciado de Jujuy */}
      <div className="relative w-full h-44 rounded-xl overflow-hidden shadow-sm border border-surface-container">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-transparent to-black/30 flex flex-col justify-between p-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-md font-label-sm text-label-sm text-on-surface shadow-sm flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              8 Puntos de Control Activos
            </span>
            <span className="w-8 h-8 rounded-full bg-surface-container-lowest/90 text-on-surface shadow-md flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">fullscreen</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white font-body-sm text-body-sm drop-shadow">
              <span className="material-symbols-outlined text-base">alt_route</span>
              <span>Ruta sugerida: Evitar colectora Chijra</span>
            </div>
            <span className="font-label-sm text-label-sm bg-surface-container-lowest text-primary px-2 py-0.5 rounded-full font-bold">
              SSJ ({selectedZone})
            </span>
          </div>
        </div>
      </div>

      {/* Botón Acción Rápida: Reportar Alerta en 1-Tap */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="flex-1 h-12 rounded-full bg-inverse-surface text-inverse-on-surface px-space-md flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
          type="button"
        >
          <span className="material-symbols-outlined text-xl text-primary-fixed">add_location_alt</span>
          <span className="font-label-lg text-label-lg">Reportar Alerta en 1-Tap</span>
        </button>
        <button
          onClick={() => alert('Radar actualizado con éxito.')}
          className="w-12 h-12 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shadow-sm active:scale-90 transition-transform flex-shrink-0"
          title="Actualizar"
          type="button"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
        </button>
      </div>

      {/* Feed de Alertas Comunitarias en Vivo */}
      <div className="flex flex-col space-y-space-sm pt-1">
        {/* Filtros de Feed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-xl">radar</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Radar de Alertas</h2>
          </div>
          <span className="font-label-sm text-label-sm text-secondary bg-surface-container px-2 py-0.5 rounded-full font-bold">
            14 cadetes activos
          </span>
        </div>

        {/* Chips Horizontales de Filtro */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm flex-shrink-0 transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest text-secondary'
            }`}
            type="button"
          >
            Todos ({alerts.length})
          </button>
          <button
            onClick={() => setActiveFilter('gruas')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm flex-shrink-0 flex items-center gap-1 transition-colors ${
              activeFilter === 'gruas'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest text-secondary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-xs">local_police</span>
            Grúas/Tránsito
          </button>
          <button
            onClick={() => setActiveFilter('lluvia')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm flex-shrink-0 flex items-center gap-1 transition-colors ${
              activeFilter === 'lluvia'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest text-secondary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-xs">tsunami</span>
            Lluvia/Badenes
          </button>
          <button
            onClick={() => setActiveFilter('cuponeros')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm flex-shrink-0 flex items-center gap-1 transition-colors ${
              activeFilter === 'cuponeros'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-lowest text-secondary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-xs">person_cancel</span>
            Cuponeros
          </button>
        </div>

        {/* Lista de Tarjetas de Alertas */}
        <div className="flex flex-col space-y-space-sm">
          {filteredAlerts.map((alertItem) => {
            const isConfirmed = confirmedAlerts[alertItem.id];
            const borderColors = {
              critical: 'bg-primary-container',
              warning: 'bg-amber-500',
              weather: 'bg-primary',
              security: 'bg-secondary',
            };

            return (
              <article
                key={alertItem.id}
                className="relative bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col space-y-space-xs overflow-hidden border border-surface-container/40"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${borderColors[alertItem.type]}`}></div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                    {alertItem.badge}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">{alertItem.time}</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-label-lg text-label-lg text-on-surface">{alertItem.title}</h3>
                  <p className="font-body-md text-body-md text-secondary mt-0.5">{alertItem.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirm(alertItem.id)}
                      className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 active:scale-95 transition-all ${
                        isConfirmed
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-primary hover:bg-primary/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">thumb_up</span>
                      <span>Sigue ahí ({alertItem.confirmCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Reporte marcado para revisión comunitaria.')}
                      className="px-2.5 py-1.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">flag</span>
                      <span>Ya se fue</span>
                    </button>
                  </div>
                  {alertItem.verified && (
                    <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-0.5 font-bold">
                      <span className="material-symbols-outlined text-sm">verified</span> Verificado
                    </span>
                  )}
                  {alertItem.extra && (
                    <span className="font-label-sm text-label-sm text-primary font-extrabold">
                      {alertItem.extra}
                    </span>
                  )}
                  {alertItem.author && (
                    <span className="font-body-sm text-body-sm text-secondary">{alertItem.author}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Modal / Sheet Rápido de Reporte */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-0">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-2xl p-space-md shadow-2xl flex flex-col space-y-space-sm animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-surface-container-highest rounded-full self-center mb-1"></div>
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Reportar Alerta en Jujuy</h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary"
                type="button"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">
              Compartí novedades de calle al instante con los cadetes conectados en San Salvador.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  alert('Seleccionado: Control / Grúa (en Fase 3 se guarda en Supabase)');
                  setIsReportModalOpen(false);
                }}
                className="p-3 rounded-xl bg-surface-container-low flex flex-col items-center gap-1.5 text-center active:bg-primary-container active:text-on-primary-container transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-2xl text-primary">local_police</span>
                <span className="font-label-sm text-label-sm font-bold">Control / Grúa</span>
              </button>
              <button
                onClick={() => {
                  alert('Seleccionado: Badén / Lluvia (en Fase 3 se guarda en Supabase)');
                  setIsReportModalOpen(false);
                }}
                className="p-3 rounded-xl bg-surface-container-low flex flex-col items-center gap-1.5 text-center active:bg-primary-container active:text-on-primary-container transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-2xl text-primary">tsunami</span>
                <span className="font-label-sm text-label-sm font-bold">Badén / Lluvia</span>
              </button>
              <button
                onClick={() => {
                  alert('Seleccionado: Gomería Cerrada (en Fase 3 se guarda en Supabase)');
                  setIsReportModalOpen(false);
                }}
                className="p-3 rounded-xl bg-surface-container-low flex flex-col items-center gap-1.5 text-center active:bg-primary-container active:text-on-primary-container transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-2xl text-primary">handyman</span>
                <span className="font-label-sm text-label-sm font-bold">Gomería Cerrada</span>
              </button>
              <button
                onClick={() => {
                  alert('Seleccionado: Cliente Fantasma (en Fase 3 se guarda en Supabase)');
                  setIsReportModalOpen(false);
                }}
                className="p-3 rounded-xl bg-surface-container-low flex flex-col items-center gap-1.5 text-center active:bg-primary-container active:text-on-primary-container transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-2xl text-primary">warning</span>
                <span className="font-label-sm text-label-sm font-bold">Cliente Fantasma</span>
              </button>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
                type="button"
              >
                <span className="material-symbols-outlined">send</span>
                Publicar en el Mapa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
