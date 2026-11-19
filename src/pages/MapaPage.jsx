import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import JujuyMap, { JUJUY_MACRO_ZONES, JUJUY_ZONES_COORDS } from '../components/JujuyMap';

const INITIAL_ALERTS = [
  {
    id: 'seed-1',
    type: 'critical',
    badge: 'Crítica • Tránsito y Grúa',
    time: 'Hace 12 min',
    title: 'Rotonda Chango Más / Coronel Arias',
    desc: 'Operativo fuerte y grúa municipal activa. Pidiendo estrictamente seguro al día, casco reglamentario y VTV. Reportado por Nico R. (Moto).',
    confirmCount: 14,
    verified: true,
    category: 'gruas',
    zone: 'Centro y Barrios',
    lat: -24.1985,
    lng: -65.2912,
  },
  {
    id: 'seed-2',
    type: 'warning',
    badge: 'Operativo Vial',
    time: 'Hace 18 min',
    title: 'Av. 10 de Junio / Barrio Malvinas',
    desc: 'Inspección de luces delanteras/traseras e indumentaria refractaria a cadetes en el ingreso a Malvinas y Coronel Arias.',
    confirmCount: 8,
    verified: false,
    author: 'Cadete: Franco L.',
    category: 'gruas',
    zone: 'Centro y Barrios',
    lat: -24.2082,
    lng: -65.2825,
  },
  {
    id: 'seed-3',
    type: 'weather',
    badge: 'Vía Intransitable',
    time: 'Hace 22 min',
    title: 'Colectora Suipacha / Chijra y Los Perales',
    desc: 'Badén crecido con arrastre de barro por lluvia en la cuenca alta. No meter moto chica ni bicicleta. Desvío sugerido por Puente Senador Pérez.',
    confirmCount: 21,
    verified: false,
    extra: 'Desvío +4 min',
    category: 'lluvia',
    zone: 'Centro y Barrios',
    lat: -24.171,
    lng: -65.2878,
  },
  {
    id: 'seed-4',
    type: 'critical',
    badge: 'Control Ruta 9 • Alto Comedero',
    time: 'Hace 27 min',
    title: 'Acceso Sur / Nueva Terminal y Av. Forestal',
    desc: 'Control caminera en colectora Ruta 9 altura pasarela Sargento Cabral. Pidiendo cédula y casco abrochado.',
    confirmCount: 16,
    verified: true,
    category: 'gruas',
    zone: 'Alto Comedero',
    lat: -24.2345,
    lng: -65.261,
  },
  {
    id: 'seed-5',
    type: 'security',
    badge: 'Alerta Ruta 66 • Palpalá',
    time: 'Hace 31 min',
    title: 'Av. Martijena esq. Libertad (Palpalá)',
    desc: 'Calzada resbaladiza y control municipal frente a la rotonda de acceso a Palpalá. Precaución al doblar.',
    confirmCount: 11,
    verified: true,
    author: 'Comunidad Cadetes Palpalá',
    category: 'gruas',
    zone: 'Palpalá',
    lat: -24.2565,
    lng: -65.2115,
  },
];

function decodeWmoWeather(code) {
  if (code === 0) return { desc: 'Despejado', icon: 'wb_sunny' };
  if (code === 1 || code === 2) return { desc: 'Algo Nublado', icon: 'partly_cloudy_day' };
  if (code === 3) return { desc: 'Nublado', icon: 'cloud' };
  if (code === 45 || code === 48) return { desc: 'Neblina / Bancos', icon: 'foggy' };
  if (code >= 51 && code <= 57) return { desc: 'Llovizna Ligera', icon: 'rainy' };
  if (code >= 61 && code <= 67) return { desc: 'Lluvia Activa', icon: 'rainy' };
  if (code >= 80 && code <= 82) return { desc: 'Chaparrones', icon: 'rainy' };
  if (code >= 95) return { desc: 'Tormenta Eléctrica', icon: 'thunderstorm' };
  return { desc: 'Nubosidad Variable', icon: 'cloud' };
}

const SHEET_COLLAPSED_PX = 122;

export default function MapaPage() {
  const navigate = useNavigate();
  const { user, profile, canWriteMap, canUseCadeteTools, isAdmin } = useAuth();

  const [selectedZone, setSelectedZone] = useState('Centro y Barrios');
  const [selectedSubzone, setSelectedSubzone] = useState('Microcentro');
  const [selectedSubzoneCoords, setSelectedSubzoneCoords] = useState(null);
  const [isShowingSubzones, setIsShowingSubzones] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [confirmedAlerts, setConfirmedAlerts] = useState({});
  const [pickedCoords, setPickedCoords] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);

  // Estado del Bottom Sheet deslizable (inicia colapsado abajo para dejar el mapa libre al fondo)
  const containerRef = useRef(null);
  const [sheetHeightPx, setSheetHeightPx] = useState(SHEET_COLLAPSED_PX);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetDragRef = useRef({
    active: false,
    startY: 0,
    startHeight: SHEET_COLLAPSED_PX,
    moved: false,
  });

  const hourlyScrollRef = useRef(null);
  const weatherIdleTimerRef = useRef(null);
  const dragScrollState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });
  const [weather, setWeather] = useState({
    temp: 17,
    feelsLike: 16,
    humidity: 60,
    wind: 7,
    rainProb: 0,
    desc: 'Nublado',
    icon: 'cloud',
    source: 'SMN Jujuy',
    hourly: [],
  });

  // Estado del formulario de nuevo pin en el modal
  const [reportCategory, setReportCategory] = useState('gruas');
  const [reportTitle, setReportTitle] = useState('Rotonda Chango Más / Acceso Sur');
  const [reportDesc, setReportDesc] = useState(
    'Pin de Control Policial y Tránsito activo. Pidiendo papeles, VTV y casco.'
  );
  const [savingAlert, setSavingAlert] = useState(false);

  const macroZonesList = Object.values(JUJUY_MACRO_ZONES);
  const currentMacroZone =
    JUJUY_MACRO_ZONES[selectedZone] || JUJUY_MACRO_ZONES['Centro y Barrios'];

  const getMaxSheetHeight = useCallback(() => {
    const h = containerRef.current?.clientHeight || window.innerHeight - 128;
    return Math.max(320, Math.round(h * 0.84));
  }, []);

  const getHalfSheetHeight = useCallback(() => {
    const h = containerRef.current?.clientHeight || window.innerHeight - 128;
    return Math.max(240, Math.round(h * 0.48));
  }, []);

  // Gestos para subir y bajar la barra inferior a voluntad del usuario
  const handleSheetPointerStart = (clientY) => {
    sheetDragRef.current = {
      active: true,
      startY: clientY,
      startHeight: sheetHeightPx,
      moved: false,
    };
    setIsDraggingSheet(true);
  };

  const handleSheetPointerMove = useCallback(
    (clientY) => {
      if (!sheetDragRef.current.active) return;
      const deltaY = sheetDragRef.current.startY - clientY;
      if (Math.abs(deltaY) > 5) {
        sheetDragRef.current.moved = true;
      }
      const maxH = getMaxSheetHeight();
      const nextHeight = Math.min(
        maxH,
        Math.max(SHEET_COLLAPSED_PX, sheetDragRef.current.startHeight + deltaY)
      );
      setSheetHeightPx(nextHeight);
    },
    [getMaxSheetHeight]
  );

  const handleSheetPointerEnd = useCallback(() => {
    if (!sheetDragRef.current.active) return;
    const wasMoved = sheetDragRef.current.moved;
    const startH = sheetDragRef.current.startHeight;
    sheetDragRef.current.active = false;
    setIsDraggingSheet(false);

    const maxH = getMaxSheetHeight();
    const halfH = getHalfSheetHeight();

    // Si solo hizo tap en la manija sin arrastrar, alterna entre colapsado -> medio -> extendido
    if (!wasMoved) {
      if (startH <= SHEET_COLLAPSED_PX + 20) {
        setSheetHeightPx(halfH);
      } else if (startH < maxH - 40) {
        setSheetHeightPx(maxH);
      } else {
        setSheetHeightPx(SHEET_COLLAPSED_PX);
      }
      return;
    }

    // Si arrastró bastante o soltó cerca de un extremo, acomoda suavemente pero respetando la dirección
    setSheetHeightPx((currentH) => {
      const delta = currentH - startH;
      if (delta > 45) {
        return currentH > halfH + 30 ? maxH : halfH;
      }
      if (delta < -45) {
        return currentH < halfH - 20 ? SHEET_COLLAPSED_PX : halfH;
      }
      // Si lo movió poquito, lo deja donde el usuario lo soltó (o colapsa si está muy abajo)
      if (currentH < SHEET_COLLAPSED_PX + 35) return SHEET_COLLAPSED_PX;
      return currentH;
    });
  }, [getHalfSheetHeight, getMaxSheetHeight]);

  useEffect(() => {
    if (!isDraggingSheet) return;
    const onMouseMove = (e) => handleSheetPointerMove(e.clientY);
    const onMouseUp = () => handleSheetPointerEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingSheet, handleSheetPointerMove, handleSheetPointerEnd]);

  const handleSelectMacroZone = (zoneId) => {
    setSelectedZone(zoneId);
    const nextMacro = JUJUY_MACRO_ZONES[zoneId];
    if (nextMacro?.subzones?.[0]) {
      setSelectedSubzone(nextMacro.subzones[0].name);
    }
    setSelectedSubzoneCoords(null);
    setIsShowingSubzones(true);
  };

  const handleSelectSubzone = (sub) => {
    setSelectedSubzone(sub.name);
    setSelectedSubzoneCoords(sub.coords);
  };

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

  // Consultar clima en vivo y pronóstico por hora (Temperatura, Precipitación y Viento)
  useEffect(() => {
    let active = true;
    const coords = selectedSubzoneCoords || currentMacroZone.center || [-24.1858, -65.2995];
    const [lat, lng] = coords;

    async function loadWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code&forecast_days=2&timezone=America%2FArgentina%2FJujuy`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !data?.current) return;

        const wmo = decodeWmoWeather(data.current.weather_code);
        const nowHour = new Date().getHours();
        const rainProb =
          data?.hourly?.precipitation_probability?.[nowHour] ??
          (data.current.precipitation > 0 ? 80 : 10);

        const hourlyItems = [];
        if (data?.hourly?.time) {
          for (let i = nowHour; i < nowHour + 12 && i < data.hourly.time.length; i++) {
            const rawTime = data.hourly.time[i] || '';
            const hourLabel = rawTime.split('T')[1] || `${i % 24}:00`;
            const hWmo = decodeWmoWeather(data.hourly.weather_code?.[i] ?? 3);
            hourlyItems.push({
              hour: i === nowHour ? 'Ahora' : hourLabel,
              temp: Math.round(data.hourly.temperature_2m?.[i] ?? data.current.temperature_2m),
              rainProb: Math.round(data.hourly.precipitation_probability?.[i] ?? 0),
              precipMm: Number(data.hourly.precipitation?.[i] ?? 0).toFixed(1),
              wind: Math.round(data.hourly.wind_speed_10m?.[i] ?? 0),
              icon: hWmo.icon,
            });
          }
        }

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: Math.round(data.current.relative_humidity_2m),
          wind: Math.round(data.current.wind_speed_10m),
          rainProb,
          desc: wmo.desc,
          icon: wmo.icon,
          source: 'SMN Jujuy',
          hourly: hourlyItems,
        });
      } catch {
        // Mantiene último estado válido si no hay conexión
      }
    }

    loadWeather();
    return () => {
      active = false;
    };
  }, [selectedZone, selectedSubzoneCoords, currentMacroZone.center]);

  // Reinicia el contador de 25 segundos cada vez que el usuario interactúa con las tarjetitas
  const resetWeatherIdleTimer = useCallback(() => {
    if (weatherIdleTimerRef.current) {
      clearTimeout(weatherIdleTimerRef.current);
    }
    weatherIdleTimerRef.current = setTimeout(() => {
      setIsWeatherExpanded(false);
    }, 25000);
  }, []);

  useEffect(() => {
    if (!isWeatherExpanded) {
      if (weatherIdleTimerRef.current) {
        clearTimeout(weatherIdleTimerRef.current);
      }
      return;
    }
    resetWeatherIdleTimer();
    return () => {
      if (weatherIdleTimerRef.current) {
        clearTimeout(weatherIdleTimerRef.current);
      }
    };
  }, [isWeatherExpanded, resetWeatherIdleTimer]);

  const handleStartAddAlert = () => {
    if (!canWriteMap) {
      if (
        window.confirm(
          '🔒 Para aportar alertas al mapa comunitario necesitás iniciar sesión o crear tu cuenta gratuita (Nivel 1: Ciudadano o Cadete). ¿Querés ir a Mi Perfil?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    // Baja el cajón inferior automáticamente para despejar todo el mapa al arrastrar el pin
    setSheetHeightPx(SHEET_COLLAPSED_PX);
    setIsWeatherExpanded(false);
    setIsPlacingPin((prev) => !prev);
  };

  const handlePinPlaced = (coords) => {
    setPickedCoords(coords);
    setIsPlacingPin(false);
    setIsReportModalOpen(true);
  };

  const handleSelectReportPreset = (preset) => {
    setReportCategory(preset.category);
    setReportTitle(preset.title);
    setReportDesc(preset.desc);
  };

  const handlePublishAlert = async () => {
    if (!canWriteMap || !user) {
      navigate('/perfil');
      return;
    }

    setSavingAlert(true);
    const authorName =
      profile?.full_name ||
      user.email?.split('@')[0] ||
      (canUseCadeteTools ? 'Cadete Verificado' : 'Vecino Jujuy');
    const authorRoleLabel = canUseCadeteTools ? 'Cadete' : 'Vecino';
    const vehicle = canUseCadeteTools ? profile?.vehicle || 'Moto' : 'Ciudadano';
    const defaultZoneCoords =
      selectedSubzoneCoords || JUJUY_ZONES_COORDS[selectedZone] || [-24.1858, -65.2995];
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
      description: `${reportDesc.trim()} Reportado por ${authorRoleLabel}: ${authorName}.`,
      zone: selectedZone,
      lat: finalLat,
      lng: finalLng,
      confirm_count: 1,
      verified: canUseCadeteTools,
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
            verified: Boolean(data.verified),
            author: `${authorRoleLabel}: ${authorName}`,
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
          verified: canUseCadeteTools,
          author: `${authorRoleLabel}: ${authorName}`,
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
    if (!canWriteMap) {
      if (
        window.confirm(
          'Iniciá sesión (Nivel 1 Ciudadano o Cadete) para confirmar alertas en vivo. ¿Ir a Mi Perfil?'
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

  const handleFocusAlertOnMap = (alertItem) => {
    if (typeof alertItem.lat === 'number' && typeof alertItem.lng === 'number') {
      setSelectedSubzoneCoords([alertItem.lat, alertItem.lng]);
      setSheetHeightPx(SHEET_COLLAPSED_PX);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.category === activeFilter;
  });

  const isSheetCollapsed = sheetHeightPx <= SHEET_COLLAPSED_PX + 24;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100dvh-8rem)] overflow-hidden bg-surface select-none"
    >
      {/* 1. MAPA INTERACTIVO AL FONDO (Ocupa toda la pantalla entre Header y BottomNav) */}
      <div className="absolute inset-0 z-10">
        <JujuyMap
          selectedZone={selectedZone}
          selectedSubzoneCoords={selectedSubzoneCoords}
          alerts={alerts}
          isPlacingPin={isPlacingPin}
          onPinPlaced={handlePinPlaced}
          onCancelPlacing={() => setIsPlacingPin(false)}
        />
      </div>

      {/* 2. HUD SUPERIOR FLOTANTE SOBRE EL MAPA (Selector de 3 Zonas + Cápsula de Clima SMN) */}
      <div className="absolute top-2.5 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Selector Compacto de 3 Zonas / Sub-barrios (sin agrandar altura) */}
        <div className="pointer-events-auto relative overflow-hidden rounded-2xl bg-primary-container/95 backdrop-blur-md text-on-primary-container p-2.5 shadow-lg border border-white/15">
          <div className="relative z-10 flex flex-col space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-ping"></span>
                <span className="font-label-sm text-[10px] text-on-primary-container tracking-wider uppercase font-extrabold">
                  {isShowingSubzones ? `Zona: ${selectedZone}` : 'Radar Jujuy • 3 Zonas'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-on-primary-container/90">
                <span className="material-symbols-outlined text-xs">wifi_tethering</span>
                <span className="font-label-sm text-[10px] font-bold">En Vivo</span>
              </div>
            </div>

            {/* Única fila intercambiable (altura fija h-8) */}
            <div className="h-8 flex items-center">
              {!isShowingSubzones ? (
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  {macroZonesList.map((zone) => {
                    const isSelected = selectedZone === zone.id;
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => handleSelectMacroZone(zone.id)}
                        className={`h-8 px-2 rounded-xl font-label-sm text-label-sm transition-all flex items-center justify-center gap-1 text-center active:scale-95 ${
                          isSelected
                            ? 'bg-surface-container-lowest text-primary shadow-sm font-extrabold'
                            : 'bg-white/15 text-on-primary-container hover:bg-white/25 font-bold'
                        }`}
                      >
                        {isSelected && (
                          <span
                            className="material-symbols-outlined text-xs"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            my_location
                          </span>
                        )}
                        <span className="truncate">{zone.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setIsShowingSubzones(false)}
                    className="flex-shrink-0 h-7 px-2.5 rounded-full bg-surface-container-lowest text-primary font-label-sm text-label-sm font-extrabold flex items-center gap-1 shadow-xs active:scale-95"
                    title="Volver a las 3 zonas"
                  >
                    <span className="material-symbols-outlined text-xs">arrow_back</span>
                    <span>Zonas</span>
                  </button>

                  {currentMacroZone.subzones.map((sub) => {
                    const isSubActive =
                      selectedSubzone === sub.name && selectedSubzoneCoords !== null;
                    return (
                      <button
                        key={sub.name}
                        type="button"
                        onClick={() => handleSelectSubzone(sub)}
                        className={`flex-shrink-0 h-7 px-2.5 rounded-full font-label-sm text-label-sm transition-colors flex items-center gap-1 active:scale-95 ${
                          isSubActive
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed font-extrabold shadow-xs'
                            : 'bg-black/25 text-on-primary-container hover:bg-black/35 font-bold'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">pin_drop</span>
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cápsula Flotante de Clima en Vivo (Despliega pronóstico de 12hs sobre el mapa) */}
        <div className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-lg flex flex-col gap-2 border border-surface-container">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsWeatherExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsWeatherExpanded((prev) => !prev);
              }
            }}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-lg text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {weather.icon}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-label-md text-label-md text-on-surface font-extrabold truncate">
                    {weather.desc} • {weather.temp}°C
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface font-label-sm text-[9px] font-extrabold flex-shrink-0">
                    {weather.source}
                  </span>
                </div>
                <p className="font-body-sm text-[11px] text-secondary truncate">
                  Viento {weather.wind} km/h • 🌧️ {weather.rainProb}% • {selectedSubzone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="font-label-sm text-label-sm text-on-surface font-extrabold">
                12h
              </span>
              <span className="material-symbols-outlined text-secondary text-base">
                {isWeatherExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </div>
          </div>

          {isWeatherExpanded && (
            <div className="pt-1.5 border-t border-surface-container space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-secondary">
                <span className="font-label-sm text-[10px] uppercase tracking-wider font-extrabold text-primary">
                  Próximas 12 Horas ({selectedSubzone})
                </span>
                <span className="font-label-sm text-[10px] text-secondary">
                  Deslizá ↔ • Tocá arriba para cerrar
                </span>
              </div>

              <div
                ref={hourlyScrollRef}
                onScroll={resetWeatherIdleTimer}
                onTouchStart={resetWeatherIdleTimer}
                onTouchMove={resetWeatherIdleTimer}
                onTouchEnd={resetWeatherIdleTimer}
                onMouseDown={(e) => {
                  resetWeatherIdleTimer();
                  const el = hourlyScrollRef.current;
                  if (!el) return;
                  dragScrollState.current = {
                    isDown: true,
                    startX: e.pageX - el.offsetLeft,
                    scrollLeft: el.scrollLeft,
                  };
                }}
                onMouseLeave={() => {
                  dragScrollState.current.isDown = false;
                }}
                onMouseUp={() => {
                  resetWeatherIdleTimer();
                  dragScrollState.current.isDown = false;
                }}
                onMouseMove={(e) => {
                  resetWeatherIdleTimer();
                  if (!dragScrollState.current.isDown || !hourlyScrollRef.current) return;
                  e.preventDefault();
                  const x = e.pageX - hourlyScrollRef.current.offsetLeft;
                  const walk = (x - dragScrollState.current.startX) * 1.4;
                  hourlyScrollRef.current.scrollLeft = dragScrollState.current.scrollLeft - walk;
                }}
                className="flex items-stretch gap-1.5 overflow-x-auto no-scrollbar pb-1 touch-pan-x cursor-grab active:cursor-grabbing"
              >
                {weather.hourly.map((h, idx) => (
                  <div
                    key={`${h.hour}-${idx}`}
                    className={`flex-shrink-0 min-w-[76px] rounded-lg p-1.5 flex flex-col items-center gap-0.5 text-center border ${
                      idx === 0
                        ? 'bg-primary-fixed/35 border-primary/30'
                        : 'bg-surface-container-low border-surface-container'
                    }`}
                  >
                    <span className="font-label-sm text-[10px] font-extrabold text-on-surface">
                      {h.hour}
                    </span>
                    <span
                      className="material-symbols-outlined text-base text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {h.icon}
                    </span>
                    <span className="font-label-md text-label-md font-extrabold text-on-surface">
                      {h.temp}°C
                    </span>
                    <span className="font-label-sm text-[9px] text-primary font-bold">
                      🌧️ {h.rainProb}% ({h.precipMm}mm)
                    </span>
                    <span className="font-label-sm text-[9px] text-secondary font-medium">
                      💨 {h.wind} km/h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTONES FLOTANTES SOBRE EL MAPA (Justo encima de la barra deslizable, estilo PedidosYa) */}
      <div
        style={{ bottom: `${Math.min(sheetHeightPx + 12, 230)}px` }}
        className="absolute left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none transition-[bottom] duration-150"
      >
        {/* Botón Circular Izquierdo: Actualizar Radar */}
        <button
          onClick={fetchAlerts}
          className="pointer-events-auto w-11 h-11 rounded-full bg-surface-container-lowest/95 text-on-surface flex items-center justify-center shadow-lg border border-surface-container active:scale-90 transition-transform flex-shrink-0"
          title="Actualizar Radar"
          type="button"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
        </button>

        {/* Botón Derecho Flotante: Agregar Alerta (Habilita pin arrastrable en el mapa) */}
        <button
          id="btn-quick-report"
          onClick={handleStartAddAlert}
          className={`pointer-events-auto h-11 rounded-full px-4 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all ${
            isPlacingPin
              ? 'bg-primary-container text-on-primary-container font-extrabold ring-4 ring-primary/30'
              : 'bg-inverse-surface/95 text-inverse-on-surface font-bold'
          }`}
          type="button"
        >
          <span
            className={`material-symbols-outlined text-lg ${
              isPlacingPin ? 'text-on-primary-container' : 'text-primary-fixed'
            }`}
          >
            {!canWriteMap ? 'lock' : isPlacingPin ? 'close' : 'add_location_alt'}
          </span>
          <span className="font-label-md text-label-md">
            {!canWriteMap
              ? 'Iniciar Sesión para Alerta'
              : isPlacingPin
              ? 'Cancelar Pin'
              : 'Agregar Alerta'}
          </span>
        </button>
      </div>

      {/* 4. BARRA / CAJÓN INFERIOR DESLIZABLE (Sube y baja a voluntad del usuario como en PedidosYa) */}
      <section
        style={{ height: `${sheetHeightPx}px` }}
        className={`absolute left-0 right-0 bottom-0 z-30 bg-surface-container-lowest rounded-t-3xl shadow-[0_-8px_30px_rgba(21,28,39,0.18)] border-t border-surface-container flex flex-col overflow-hidden ${
          isDraggingSheet ? '' : 'transition-[height] duration-200 ease-out'
        }`}
      >
        {/* Manija y Cabecera Táctil para Deslizar Arriba / Abajo */}
        <div
          onTouchStart={(e) => {
            if (e.touches?.[0]) handleSheetPointerStart(e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches?.[0]) handleSheetPointerMove(e.touches[0].clientY);
          }}
          onTouchEnd={handleSheetPointerEnd}
          onMouseDown={(e) => handleSheetPointerStart(e.clientY)}
          className="pt-2 pb-2 px-4 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 bg-surface-container-lowest"
        >
          {/* Barrita Indicadora (Drag Handle) */}
          <div className="w-11 h-1.5 rounded-full bg-secondary/30 mx-auto mb-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-xl">radar</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Radar de Alertas ({filteredAlerts.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSheetHeightPx(
                  isSheetCollapsed ? getHalfSheetHeight() : SHEET_COLLAPSED_PX
                );
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-bold active:scale-95"
            >
              <span>{isSheetCollapsed ? 'Deslizá o tocá ↑' : 'Bajar barra ↓'}</span>
            </button>
          </div>
        </div>

        {/* Chips Horizontales de Filtro (Siempre visibles incluso con la barra baja) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2.5 flex-shrink-0 border-b border-surface-container/70">
          <button
            onClick={() => {
              setActiveFilter('all');
              if (isSheetCollapsed) setSheetHeightPx(getHalfSheetHeight());
            }}
            className={`px-3 py-1 rounded-full font-label-sm text-label-sm shadow-xs flex-shrink-0 transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-low text-secondary'
            }`}
            type="button"
          >
            Todos ({alerts.length})
          </button>
          <button
            onClick={() => {
              setActiveFilter('gruas');
              if (isSheetCollapsed) setSheetHeightPx(getHalfSheetHeight());
            }}
            className={`px-3 py-1 rounded-full font-label-sm text-label-sm shadow-xs flex-shrink-0 flex items-center gap-1 transition-colors ${
              activeFilter === 'gruas'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-low text-secondary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-xs">local_police</span>
            Grúas/Tránsito
          </button>
          <button
            onClick={() => {
              setActiveFilter('lluvia');
              if (isSheetCollapsed) setSheetHeightPx(getHalfSheetHeight());
            }}
            className={`px-3 py-1 rounded-full font-label-sm text-label-sm shadow-xs flex-shrink-0 flex items-center gap-1 transition-colors ${
              activeFilter === 'lluvia'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-low text-secondary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-xs">tsunami</span>
            Lluvia/Badenes
          </button>
          <button
            onClick={() => {
              setActiveFilter('cuponeros');
              if (isSheetCollapsed) setSheetHeightPx(getHalfSheetHeight());
            }}
            className={`px-3 py-1 rounded-full font-label-sm text-label-sm shadow-xs flex-shrink-0 flex items-center gap-1 transition-colors ${
              activeFilter === 'cuponeros'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container-low text-secondary'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-xs">person_cancel</span>
            Cuponeros
          </button>
        </div>

        {/* Lista Desplazable de Tarjetas de Alertas (Visible al subir la barra) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-surface">
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
                className="relative bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex flex-col space-y-1.5 overflow-hidden border border-surface-container/60"
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
                    <button
                      type="button"
                      onClick={() => handleFocusAlertOnMap(alertItem)}
                      className="text-primary font-label-sm text-label-sm font-bold flex items-center gap-0.5 hover:underline"
                      title="Ver pin en el mapa"
                    >
                      <span className="material-symbols-outlined text-sm">pin_drop</span>
                      Ver en mapa
                    </button>
                    <span className="font-body-sm text-body-sm text-secondary">
                      {alertItem.time}
                    </span>
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
                  <h3 className="font-label-lg text-label-lg text-on-surface font-extrabold">
                    {alertItem.title}
                  </h3>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    {alertItem.desc}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1.5">
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
                    <span className="font-body-sm text-body-sm text-secondary">
                      {alertItem.author}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

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
              El pin quedará registrado con tu usuario ({profile?.full_name || user?.email}).
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
