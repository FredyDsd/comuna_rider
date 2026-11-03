import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import JujuyMap, { JUJUY_ZONES_COORDS } from '../components/JujuyMap';

const INITIAL_ALERTS = [
  {
    id: 'seed-1',
    type: 'critical',
    badge: 'Crítica • Tránsito y Grúa',
    time: 'Hace 12 min',
    title: 'Rotonda Chango Más / Acceso Sur',
    desc: 'Operativo fuerte y grúa municipal activa. Pidiendo estrictamente seguro al día, casco reglamentario y VTV. Reportado por Nico R. (Moto).',
    confirmCount: 14,
    verified: true,
    category: 'gruas',
    zone: 'Centro',
    lat: -24.1985,
    lng: -65.2912,
  },
  {
    id: 'seed-2',
    type: 'warning',
    badge: 'Operativo Vial',
    time: 'Hace 18 min',
    title: 'Cerro Las Rosas / Av. Párroco Marske',
    desc: 'Inspección de luces delanteras/traseras e indumentaria refractaria a cadetes que bajan hacia el sur. Sin retenciones por ahora.',
    confirmCount: 8,
    verified: false,
    author: 'Cadete: Franco L.',
    category: 'gruas',
    zone: 'Cuyaya',
    lat: -24.1952,
    lng: -65.3045,
  },
  {
    id: 'seed-3',
    type: 'weather',
    badge: 'Vía Intransitable',
    time: 'Hace 22 min',
    title: 'Colectora Suipacha / Chijra (Badén)',
    desc: 'Badén crecido con arrastre de barro por lluvia en la cuenca alta. No meter moto chica ni bicicleta. Desvío sugerido por Puente Senador Pérez.',
    confirmCount: 21,
    verified: false,
    extra: 'Desvío +4 min',
    category: 'lluvia',
    zone: 'Chijra',
    lat: -24.171,
    lng: -65.2878,
  },
  {
    id: 'seed-4',
    type: 'security',
    badge: 'Alerta Seguridad / Cliente',
    time: 'Hace 31 min',
    title: 'Barrio Cuyaya (Calle Olavarría alt. 400)',
    desc: 'Usuario con cuenta nueva haciendo pedidos reiterados con pago en efectivo falso / intenta cobrar vuelto antes de recibir. Cobren antes de soltar la mochila.',
    confirmCount: 19,
    verified: false,
    author: 'Comunidad Cadetes SSJ',
    category: 'cuponeros',
    zone: 'Cuyaya',
    lat: -24.1885,
    lng: -65.3128,
  },
];

export default function MapaPage() {
  const navigate = useNavigate();
  const { user, profile, canWriteMapAndShifts, isAdmin } = useAuth();

  const [selectedZone, setSelectedZone] = useState('Centro');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [confirmedAlerts, setConfirmedAlerts] = useState({});
  const [pickedCoords, setPickedCoords] = useState(null);

  // Estado del formulario de nuevo pin en el modal
  const [reportCategory, setReportCategory] = useState('gruas');
  const [reportTitle, setReportTitle] = useState('Rotonda Chango Más / Acceso Sur');
  const [reportDesc, setReportDesc] = useState(
    'Pin de Control Policial y Tránsito activo. Pidiendo papeles, VTV y casco.'
  );
  const [savingAlert, setSavingAlert] = useState(false);

  const zones = [
    'Centro',
    'Alto Comedero',
    'Nueva Terminal',
    'Cuyaya',
    'Chijra',
    'La Viña',
    'Los Perales',
    'Palpalá',
  ];

  const fetchAlerts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedDbAlerts = data.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          type: row.type || 'critical',
          badge: row.badge || 'Crítica • Control Policial',
          time: 'Reciente',
          title: row.title,
          desc: row.description,
          confirmCount: row.confirm_count ?? 1,
          verified: row.verified ?? true,
          author: row.author_name ? `Cadete: ${row.author_name}` : undefined,
          extra: row.extra || undefined,
          category: row.category || 'gruas',
          zone: row.zone || 'Centro',
          lat: typeof row.lat === 'number' ? row.lat : -24.1858,
          lng: typeof row.lng === 'number' ? row.lng : -65.2995,
          isFromDb: true,
        }));
        setAlerts([...mappedDbAlerts, ...INITIAL_ALERTS]);
      }
    } catch (err) {
      console.warn('Error cargando alertas desde Supabase:', err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleOpenReportModal = (coords = null) => {
    if (!canWriteMapAndShifts) {
      if (
        window.confirm(
          '🔒 Acción restringida (Nivel 1: Visitante).\nSolo los Cadetes Verificados pueden agregar pines al mapa. ¿Querés ir a Mi Perfil para iniciar sesión o registrarte?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    if (coords && typeof coords.lat === 'number') {
      setPickedCoords(coords);
    }
    setIsReportModalOpen(true);
  };

  const handleSelectReportPreset = (preset) => {
    setReportCategory(preset.category);
    setReportTitle(preset.title);
    setReportDesc(preset.desc);
  };

  const handlePublishAlert = async () => {
    if (!canWriteMapAndShifts || !user) {
      navigate('/perfil');
      return;
    }

    setSavingAlert(true);
    const authorName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Verificado';
    const vehicle = profile?.vehicle || 'Moto';
    const defaultZoneCoords = JUJUY_ZONES_COORDS[selectedZone] || [-24.1858, -65.2995];
    const finalLat = pickedCoords?.lat ?? defaultZoneCoords[0];
    const finalLng = pickedCoords?.lng ?? defaultZoneCoords[1];

    const presetConfig = {
      gruas: {
        type: 'critical',
        badge: 'Crítica • Control Policial / Grúa',
      },
      lluvia: {
        type: 'weather',
        badge: 'Vía Intransitable • Lluvia/Badén',
      },
      gomeria: {
        type: 'warning',
        badge: 'Aviso Ruta • Gomería Cerrada',
      },
      cuponeros: {
        type: 'security',
        badge: 'Alerta Seguridad • Cliente Fantasma',
      },
    }[reportCategory] || {
      type: 'critical',
      badge: 'Crítica • Control Policial',
    };

    const newDbRow = {
      user_id: user.id,
      author_name: `${authorName} (${vehicle})`,
      vehicle,
      type: presetConfig.type,
      category: reportCategory === 'gomeria' ? 'gruas' : reportCategory,
      badge: presetConfig.badge,
      title: reportTitle.trim() || `Alerta en ${selectedZone}`,
      description: `${reportDesc.trim()} Reportado por ${authorName} (${vehicle}).`,
      zone: selectedZone,
      lat: finalLat,
      lng: finalLng,
      confirm_count: 1,
      verified: true,
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('alerts')
          .insert(newDbRow)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const uiAlert = {
            id: data.id,
            user_id: data.user_id,
            type: data.type,
            badge: data.badge,
            time: 'Ahora mismo',
            title: data.title,
            desc: data.description,
            confirmCount: data.confirm_count,
            verified: true,
            author: `Cadete: ${authorName}`,
            category: data.category,
            zone: data.zone,
            lat: data.lat,
            lng: data.lng,
            isFromDb: true,
          };
          setAlerts((prev) => [uiAlert, ...prev]);
        }
      } else {
        const localAlert = {
          id: `local-${Date.now()}`,
          user_id: user.id,
          type: newDbRow.type,
          badge: newDbRow.badge,
          time: 'Ahora mismo',
          title: newDbRow.title,
          desc: newDbRow.description,
          confirmCount: 1,
          verified: true,
          author: `Cadete: ${authorName}`,
          category: newDbRow.category,
          zone: newDbRow.zone,
          lat: finalLat,
          lng: finalLng,
        };
        setAlerts((prev) => [localAlert, ...prev]);
      }
      setPickedCoords(null);
      setIsReportModalOpen(false);
    } catch (err) {
      alert(`Error al guardar pin en Supabase: ${err.message}`);
    } finally {
      setSavingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertItem) => {
    if (!user) return;
    if (alertItem.user_id !== user.id && !isAdmin) return;

    try {
      if (alertItem.isFromDb && isSupabaseConfigured) {
        const { error } = await supabase.from('alerts').delete().eq('id', alertItem.id);
        if (error) throw error;
      }
      setAlerts((prev) => prev.filter((a) => a.id !== alertItem.id));
    } catch (err) {
      alert(`No se pudo borrar la alerta: ${err.message}`);
    }
  };

  const handleConfirm = async (alertItem) => {
    if (!canWriteMapAndShifts) {
      if (
        window.confirm(
          'Iniciá sesión como Cadete Verificado para confirmar alertas en vivo. ¿Ir a Mi Perfil?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    if (confirmedAlerts[alertItem.id]) return;

    const nextCount = alertItem.confirmCount + 1;
    setConfirmedAlerts((prev) => ({ ...prev, [alertItem.id]: true }));
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertItem.id ? { ...a, confirmCount: nextCount } : a))
    );

    if (alertItem.isFromDb && isSupabaseConfigured) {
      await supabase
        .from('alerts')
        .update({ confirm_count: nextCount })
        .eq('id', alertItem.id);
    }
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
              Zona de Operación Actual (Tocá para mover el mapa)
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

      {/* Mapa Interactivo Real de Jujuy (Leaflet + OpenStreetMap) */}
      <JujuyMap
        selectedZone={selectedZone}
        alerts={alerts}
        pickedCoords={pickedCoords}
        onPickCoords={(coords) => setPickedCoords(coords)}
        onOpenReportWithCoords={(coords) => handleOpenReportModal(coords)}
      />

      {/* Botón Acción Rápida: Reportar Alerta en 1-Tap */}
      <div className="flex items-center gap-2">
        <button
          id="btn-quick-report"
          onClick={() => handleOpenReportModal(pickedCoords)}
          className="flex-1 h-12 rounded-full bg-inverse-surface text-inverse-on-surface px-space-md flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
          type="button"
        >
          <span className="material-symbols-outlined text-xl text-primary-fixed">
            {canWriteMapAndShifts ? 'add_location_alt' : 'lock'}
          </span>
          <span className="font-label-lg text-label-lg">
            {canWriteMapAndShifts
              ? 'Reportar Alerta en 1-Tap'
              : 'Iniciar Sesión para Reportar Pin'}
          </span>
        </button>
        <button
          onClick={fetchAlerts}
          className="w-12 h-12 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shadow-sm active:scale-90 transition-transform flex-shrink-0"
          title="Actualizar Radar"
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
            const canDelete = user && (alertItem.user_id === user.id || isAdmin);
            const borderColors = {
              critical: 'bg-primary-container',
              warning: 'bg-amber-500',
              weather: 'bg-primary',
              security: 'bg-secondary',
              sos: 'bg-error',
            };

            return (
              <article
                key={alertItem.id}
                className="relative bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col space-y-space-xs overflow-hidden border border-surface-container/40"
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    borderColors[alertItem.type] || 'bg-primary-container'
                  }`}
                ></div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                    {alertItem.badge}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-body-sm text-body-sm text-secondary">{alertItem.time}</span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(alertItem)}
                        title="Borrar alerta"
                        className="text-error hover:opacity-80 flex items-center"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-label-lg text-label-lg text-on-surface">{alertItem.title}</h3>
                  <p className="font-body-md text-body-md text-secondary mt-0.5">{alertItem.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirm(alertItem)}
                      className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 active:scale-95 transition-all ${
                        isConfirmed
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-primary hover:bg-primary/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">thumb_up</span>
                      <span>Sigue ahí ({alertItem.confirmCount})</span>
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(alertItem)}
                        className="px-2.5 py-1.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">flag</span>
                        <span>Ya se fue</span>
                      </button>
                    )}
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
                  {alertItem.author && !alertItem.verified && (
                    <span className="font-body-sm text-body-sm text-secondary">{alertItem.author}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Modal / Sheet Rápido de Reporte — z-[100] centrado para no quedar tapado por BottomNav */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-space-md shadow-2xl flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Reportar Alerta en Jujuy
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary"
                type="button"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">
              El pin quedará registrado con tu ID de Cadete Verificado ({profile?.full_name || user?.email}).
            </p>
            {pickedCoords && (
              <div className="px-3 py-1.5 rounded-lg bg-surface-container-low font-label-sm text-label-sm text-primary flex items-center justify-between">
                <span>
                  📍 Coordenadas: {pickedCoords.lat}, {pickedCoords.lng}
                </span>
                <button
                  type="button"
                  onClick={() => setPickedCoords(null)}
                  className="text-secondary underline"
                >
                  Usar centro de {selectedZone}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() =>
                  handleSelectReportPreset({
                    category: 'gruas',
                    title: `Rotonda Chango Más / ${selectedZone}`,
                    desc: 'Pin de Control Policial y Tránsito activo. Pidiendo papeles, VTV y casco.',
                  })
                }
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center transition-colors ${
                  reportCategory === 'gruas'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-container-low text-on-surface'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-2xl">local_police</span>
                <span className="font-label-sm text-label-sm font-bold">Control Policial / Grúa</span>
              </button>
              <button
                onClick={() =>
                  handleSelectReportPreset({
                    category: 'lluvia',
                    title: `Colectora / Badén (${selectedZone})`,
                    desc: 'Calzada anegada o badén crecido por lluvia. Circular con precaución.',
                  })
                }
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center transition-colors ${
                  reportCategory === 'lluvia'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-container-low text-on-surface'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-2xl">tsunami</span>
                <span className="font-label-sm text-label-sm font-bold">Badén / Lluvia</span>
              </button>
              <button
                onClick={() =>
                  handleSelectReportPreset({
                    category: 'gomeria',
                    title: `Gomería en ${selectedZone}`,
                    desc: 'Gomería cerrada temporalmente o sin compresor en este turno.',
                  })
                }
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center transition-colors ${
                  reportCategory === 'gomeria'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-container-low text-on-surface'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-2xl">handyman</span>
                <span className="font-label-sm text-label-sm font-bold">Gomería Cerrada</span>
              </button>
              <button
                onClick={() =>
                  handleSelectReportPreset({
                    category: 'cuponeros',
                    title: `Zona Roja / Alerta en ${selectedZone}`,
                    desc: 'Pedido sospechoso o zona insegura reportada por cadetes en turno.',
                  })
                }
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-center transition-colors ${
                  reportCategory === 'cuponeros'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-container-low text-on-surface'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-2xl">warning</span>
                <span className="font-label-sm text-label-sm font-bold">Zona Roja / Fantasma</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Ubicación (Ej: Rotonda Chango Más)"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
              />
              <input
                type="text"
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Detalle del reporte para los compañeros"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                id="btn-confirm-report"
                disabled={savingAlert}
                onClick={handlePublishAlert}
                className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
                type="button"
              >
                <span className="material-symbols-outlined">send</span>
                {savingAlert ? 'Guardando Pin en Supabase...' : 'Publicar en el Mapa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
