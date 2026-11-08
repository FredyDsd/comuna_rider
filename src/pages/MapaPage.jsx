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

export default function MapaPage() {
  const navigate = useNavigate();
  const { user, profile, canWriteMapAndShifts, isAdmin } = useAuth();

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
    if (!canWriteMapAndShifts) {
      if (
        window.confirm(
          '🔒 Acción restringida (Nivel 1: Visitante).\nSolo los Cadetes Verificados pueden agregar alertas al mapa. ¿Querés ir a Mi Perfil para iniciar sesión o registrarte?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    // Si ya estaba en modo ubicar pin, lo cancela; si no, activa el pin arrastrable
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
    if (!canWriteMapAndShifts || !user) {
      navigate('/perfil');
      return;
    }

    setSavingAlert(true);
    const authorName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Verificado';
    const vehicle = profile?.vehicle || 'Moto';
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
    <div className="flex flex-col w-full pb-6 space-y-3 pt-1.5">
      {/* Sub-banner Compacto: Muestra las 3 Zonas o los Sub-barrios en la misma fila sin agrandar la caja */}
      <div className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary-container p-3 shadow-md">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping"></span>
              <span className="font-label-sm text-label-sm text-on-primary-container tracking-wider uppercase font-extrabold">
                {isShowingSubzones ? `Zona: ${selectedZone}` : 'Radar Comunitario • 3 Zonas'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-on-primary-container/90">
              <span className="material-symbols-outlined text-sm">wifi_tethering</span>
              <span className="font-label-sm text-label-sm">En Vivo</span>
            </div>
          </div>

          {/* Única fila intercambiable (altura fija h-9 para no expandir la tarjeta) */}
          <div className="h-9 flex items-center">
            {!isShowingSubzones ? (
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {macroZonesList.map((zone) => {
                  const isSelected = selectedZone === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => handleSelectMacroZone(zone.id)}
                      className={`h-9 px-2 rounded-xl font-label-md text-label-md transition-all flex items-center justify-center gap-1 text-center active:scale-95 ${
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
                {/* Botón fijo para volver a elegir cualquiera de las 3 zonas */}
                <button
                  type="button"
                  onClick={() => setIsShowingSubzones(false)}
                  className="flex-shrink-0 h-8 px-2.5 rounded-full bg-surface-container-lowest text-primary font-label-sm text-label-sm font-extrabold flex items-center gap-1 shadow-xs active:scale-95"
                  title="Volver a las 3 zonas"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Zonas</span>
                </button>

                {/* Sub-barrios en el mismo lugar */}
                {currentMacroZone.subzones.map((sub) => {
                  const isSubActive = selectedSubzone === sub.name && selectedSubzoneCoords !== null;
                  return (
                    <button
                      key={sub.name}
                      type="button"
                      onClick={() => handleSelectSubzone(sub)}
                      className={`flex-shrink-0 h-8 px-2.5 rounded-full font-label-sm text-label-sm transition-colors flex items-center gap-1 active:scale-95 ${
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

      {/* Widget de Clima en Vivo (Solo la parte superior abre/cierra; las tarjetas inferiores se deslizan libremente) */}
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col gap-2.5 border border-surface-container/50 select-none transition-all duration-200 hover:border-primary/30">
        {/* Parte superior: único disparador para desplegar o replegar */}
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
          className="flex items-center justify-between gap-2.5 cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
              <span
                className="material-symbols-outlined text-xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {weather.icon}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-label-lg text-label-lg text-on-surface font-extrabold truncate">
                  {weather.desc} • {weather.temp}°C
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-[10px] font-extrabold flex-shrink-0">
                  {weather.source}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-secondary truncate">
                Humedad {weather.humidity}% • Viento {weather.wind} km/h • {selectedSubzone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex flex-col items-end">
              <span className="font-label-lg text-label-lg text-on-surface font-extrabold tracking-tight">
                ST {weather.feelsLike}°C
              </span>
              <span className="font-label-sm text-label-sm text-secondary">
                🌧️ {weather.rainProb}% lluvia
              </span>
            </div>
            <span className="material-symbols-outlined text-secondary text-lg">
              {isWeatherExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </div>

        {/* Panel desplegable con pronóstico de las próximas 12 horas (Deslizable a los laterales) */}
        {isWeatherExpanded && (
          <div className="pt-2 border-t border-surface-container space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-extrabold text-primary">
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
              className="flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-1 touch-pan-x cursor-grab active:cursor-grabbing"
            >
              {weather.hourly.map((h, idx) => (
                <div
                  key={`${h.hour}-${idx}`}
                  className={`flex-shrink-0 min-w-[80px] rounded-lg p-2 flex flex-col items-center gap-1 text-center border ${
                    idx === 0
                      ? 'bg-primary-fixed/35 border-primary/30'
                      : 'bg-surface-container-low border-surface-container'
                  }`}
                >
                  <span className="font-label-sm text-label-sm font-extrabold text-on-surface">
                    {h.hour}
                  </span>
                  <span
                    className="material-symbols-outlined text-lg text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {h.icon}
                  </span>
                  {/* Temperatura */}
                  <span className="font-label-md text-label-md font-extrabold text-on-surface">
                    {h.temp}°C
                  </span>
                  {/* Precipitación */}
                  <span className="font-label-sm text-[10px] text-primary font-bold flex items-center gap-0.5">
                    🌧️ {h.rainProb}% ({h.precipMm}mm)
                  </span>
                  {/* Viento */}
                  <span className="font-label-sm text-[10px] text-secondary font-medium flex items-center gap-0.5">
                    💨 {h.wind} km/h
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mapa Interactivo Real de Jujuy (Leaflet + OpenStreetMap) */}
      <JujuyMap
        selectedZone={selectedZone}
        selectedSubzoneCoords={selectedSubzoneCoords}
        alerts={alerts}
        isPlacingPin={isPlacingPin}
        onPinPlaced={handlePinPlaced}
        onCancelPlacing={() => setIsPlacingPin(false)}
      />

      {/* Botón Acción Rápida: Agregar Alerta (Habilita pin arrastrable en el mapa) */}
      <div className="flex items-center gap-2">
        <button
          id="btn-quick-report"
          onClick={handleStartAddAlert}
          className={`flex-1 h-12 rounded-full px-space-md flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all ${
            isPlacingPin
              ? 'bg-primary-container text-on-primary-container font-extrabold'
              : 'bg-inverse-surface text-inverse-on-surface'
          }`}
          type="button"
        >
          <span
            className={`material-symbols-outlined text-xl ${
              isPlacingPin ? 'text-on-primary-container' : 'text-primary-fixed'
            }`}
          >
            {!canWriteMapAndShifts ? 'lock' : isPlacingPin ? 'open_with' : 'add_location_alt'}
          </span>
          <span className="font-label-lg text-label-lg">
            {!canWriteMapAndShifts
              ? 'Iniciar Sesión para Agregar Alerta'
              : isPlacingPin
              ? 'Arrastrá el Pin en el Mapa (Cancelar)'
              : 'Agregar Alerta'}
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
