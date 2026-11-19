import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Límite geográfico con margen de +10 km alrededor de Gran San Salvador de Jujuy + Alto Comedero + Palpalá
// Permite navegar con holgura toda el área metropolitana sin irse a Salta o Humahuaca.
export const GRAN_JUJUY_BOUNDS = L.latLngBounds(
  [-24.375, -65.435], // Suroeste (+10 km al sur de Alto Comedero/Palpalá y +10 km al oeste de Los Perales/Reyes)
  [-24.06, -65.085]   // Noreste (+10 km al norte de La Viña/Chijra y +10 km al este de Palpalá)
);

export const JUJUY_MACRO_ZONES = {
  'Centro y Barrios': {
    id: 'Centro y Barrios',
    shortLabel: 'Centro y Barrios',
    subtitle: 'Centro, Perales, Cuyaya, Chijra, Cnel. Arias, Malvinas',
    center: [-24.1875, -65.2965],
    zoom: 14,
    color: '#ea0029',
    bounds: [
      [-24.2155, -65.326],
      [-24.156, -65.272],
    ],
    subzones: [
      { name: 'Microcentro', coords: [-24.1858, -65.2995] },
      { name: 'Malvinas', coords: [-24.2088, -65.2818] },
      { name: 'Coronel Arias', coords: [-24.2025, -65.2855] },
      { name: 'Los Perales', coords: [-24.1725, -65.3085] },
      { name: 'Cuyaya', coords: [-24.189, -65.3135] },
      { name: 'San Pedrito', coords: [-24.1965, -65.2895] },
      { name: 'Chijra / La Viña', coords: [-24.167, -65.283] },
    ],
  },
  'Alto Comedero': {
    id: 'Alto Comedero',
    shortLabel: 'Alto Comedero',
    subtitle: 'Nueva Terminal, Ruta 9, Sgto. Cabral, Av. Forestal, B6',
    center: [-24.2365, -65.261],
    zoom: 14,
    color: '#d97706',
    bounds: [
      [-24.262, -65.285],
      [-24.211, -65.242],
    ],
    subzones: [
      { name: 'Av. Forestal / Centro AC', coords: [-24.2385, -65.2595] },
      { name: 'Nueva Terminal', coords: [-24.2145, -65.2755] },
      { name: 'Sargento Cabral', coords: [-24.2285, -65.2665] },
      { name: 'Sector B6 / 30 Hectáreas', coords: [-24.2495, -65.253] },
    ],
  },
  Palpalá: {
    id: 'Palpalá',
    shortLabel: 'Palpalá',
    subtitle: 'Palpalá Centro, Av. Martijena, Ruta 66, Río Blanco',
    center: [-24.2565, -65.2115],
    zoom: 14,
    color: '#00b67a',
    bounds: [
      [-24.276, -65.241],
      [-24.224, -65.189],
    ],
    subzones: [
      { name: 'Palpalá Centro', coords: [-24.2565, -65.2115] },
      { name: 'Av. Martijena / Ruta 66', coords: [-24.2615, -65.206] },
      { name: 'Río Blanco', coords: [-24.2275, -65.2365] },
      { name: '23 de Agosto / Florida', coords: [-24.248, -65.202] },
    ],
  },
};

// Mapa plano de coordenadas para compatibilidad rápida
export const JUJUY_ZONES_COORDS = {
  'Centro y Barrios': [-24.1875, -65.2965],
  'Alto Comedero': [-24.2365, -65.261],
  Palpalá: [-24.2565, -65.2115],
  Centro: [-24.1858, -65.2995],
  Malvinas: [-24.2088, -65.2818],
  'Coronel Arias': [-24.2025, -65.2855],
  'Los Perales': [-24.1725, -65.3085],
  Cuyaya: [-24.189, -65.3135],
  'San Pedrito': [-24.1965, -65.2895],
  'Chijra / La Viña': [-24.167, -65.283],
  'Nueva Terminal': [-24.2145, -65.2755],
};

function createPinIcon(type = 'critical', isTemp = false) {
  const colors = {
    critical: '#ea0029',
    controles: '#ea0029',
    warning: '#f59e0b',
    weather: '#0284c7',
    calles: '#0284c7',
    gomerias: '#00b67a',
    clientes: '#7c3aed',
    security: '#4f46e5',
    sos: '#dc2626',
    temp: '#151c27',
  };
  const bg = isTemp ? colors.temp : colors[type] || colors.critical;
  const emoji = isTemp
    ? '📍'
    : type === 'critical' || type === 'controles'
    ? '🚓'
    : type === 'weather' || type === 'calles'
    ? '🚧'
    : type === 'gomerias'
    ? '🔧'
    : type === 'clientes'
    ? '📋'
    : type === 'warning'
    ? '⚠️'
    : type === 'sos'
    ? '🚨'
    : '🛡️';

  const isSos = !isTemp && type === 'sos';

  return L.divIcon({
    className: 'custom-jujuy-pin',
    html: isTemp
      ? `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-14px);">
          <div style="background:#151c27;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap;margin-bottom:3px;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
            👆 Arrastrame al lugar
          </div>
          <div style="
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            background: #ea0029;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            border: 3px solid #ffffff;
            box-shadow: 0 6px 16px rgba(234,0,41,0.55);
            cursor: grab;
          ">📍</div>
        </div>`
      : `<div style="
          width: ${isSos ? '40px' : '36px'};
          height: ${isSos ? '40px' : '36px'};
          border-radius: 9999px;
          background: ${bg};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSos ? '18px' : '16px'};
          border: 2.5px solid #ffffff;
          box-shadow: ${
            isSos
              ? '0 0 0 6px rgba(220,38,38,0.32), 0 4px 12px rgba(220,38,38,0.55)'
              : '0 4px 10px rgba(0,0,0,0.32)'
          };
        ">${emoji}</div>`,
    iconSize: isTemp ? [130, 66] : isSos ? [40, 40] : [36, 36],
    iconAnchor: isTemp ? [65, 60] : isSos ? [20, 40] : [18, 36],
    popupAnchor: [0, -34],
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPinPopupHtml(item) {
  const badgeColor =
    item.type === 'gomerias'
      ? '#00b67a'
      : item.type === 'clientes'
      ? '#7c3aed'
      : item.type === 'calles' || item.type === 'weather'
      ? '#0284c7'
      : '#ea0029';

  if (item.type === 'gomerias') {
    const cleanPhone = (item.phone || '').replace(/\D/g, '');
    return `<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 190px;">
      <div style="font-size: 10px; font-weight: 800; color: ${badgeColor}; text-transform: uppercase;">${escapeHtml(item.badge || 'Gomería / Taller')}</div>
      <div style="font-size: 13px; font-weight: 800; color: #151c27; margin-top: 2px;">${escapeHtml(item.title)}</div>
      <div style="font-size: 11px; color: #575e70; margin-top: 3px;">${escapeHtml(item.address || item.desc)}</div>
      <div style="font-size: 11px; font-weight: 700; color: #151c27; margin-top: 4px;">🕒 ${escapeHtml(item.hours || 'Consultar horario')}</div>
      ${
        cleanPhone
          ? `<div style="margin-top: 6px; display: flex; gap: 6px;">
              <a href="tel:${escapeHtml(item.phone)}" style="font-size: 11px; font-weight: 800; color: #00b67a; text-decoration: none;">📞 Llamar</a>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${item.title} ${item.address || ''} Jujuy`
              )}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 800; color: #0284c7; text-decoration: none;">🗺️ Maps</a>
            </div>`
          : ''
      }
    </div>`;
  }

  if (item.type === 'clientes') {
    const lastComment =
      Array.isArray(item.comments) && item.comments.length > 0
        ? item.comments[item.comments.length - 1]
        : null;
    return `<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 195px;">
      <div style="font-size: 10px; font-weight: 800; color: ${badgeColor}; text-transform: uppercase;">${escapeHtml(item.tag || item.badge || 'Historial')} • ${item.reportsCount ?? item.confirmCount ?? 1} reportes</div>
      <div style="font-size: 13px; font-weight: 800; color: #151c27; margin-top: 2px;">${escapeHtml(item.title)}</div>
      <div style="font-size: 11px; color: #575e70; margin-top: 4px;">${
        lastComment
          ? `<strong>${escapeHtml(lastComment.author)}:</strong> ${escapeHtml(lastComment.text)}`
          : escapeHtml(item.desc)
      }</div>
    </div>`;
  }

  if (item.type === 'sos') {
    const cleanPhone = (item.phone || '').replace(/\D/g, '');
    return `<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 195px;">
      <div style="font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase;">🚨 ${escapeHtml(item.badge || 'SOS Auxilio')} • ${escapeHtml(item.time || '')}</div>
      <div style="font-size: 13px; font-weight: 800; color: #151c27; margin-top: 2px;">${escapeHtml(item.title)}</div>
      <div style="font-size: 11px; color: #575e70; margin-top: 3px;">${escapeHtml(item.desc)}</div>
      ${
        cleanPhone
          ? `<div style="margin-top: 6px; font-size: 11px; font-weight: 800; color: #151c27;">📱 Tel: ${escapeHtml(item.phone)}</div>`
          : ''
      }
    </div>`;
  }

  return `<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 175px;">
    <div style="font-size: 10px; font-weight: 800; color: ${badgeColor}; text-transform: uppercase;">${escapeHtml(item.badge)}</div>
    <div style="font-size: 13px; font-weight: 700; color: #151c27; margin-top: 2px;">${escapeHtml(item.title)}</div>
    <div style="font-size: 11px; color: #575e70; margin-top: 4px;">${escapeHtml(item.desc)}</div>
  </div>`;
}

export default function JujuyMap({
  selectedZone = 'Centro y Barrios',
  selectedSubzoneCoords = null,
  alerts = [],
  isPlacingPin = false,
  onPinPlaced,
  onCancelPlacing,
  onSelectPin,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tempMarkerRef = useRef(null);
  const onPinPlacedRef = useRef(onPinPlaced);
  const onSelectPinRef = useRef(onSelectPin);

  useEffect(() => {
    onPinPlacedRef.current = onPinPlaced;
  }, [onPinPlaced]);

  useEffect(() => {
    onSelectPinRef.current = onSelectPin;
  }, [onSelectPin]);

  // Inicializar mapa Leaflet a pantalla completa al fondo con bloqueo fuera de Jujuy / Palpalá
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const macro = JUJUY_MACRO_ZONES[selectedZone] || JUJUY_MACRO_ZONES['Centro y Barrios'];

    const map = L.map(mapContainerRef.current, {
      center: macro.center,
      zoom: macro.zoom,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: GRAN_JUJUY_BOUNDS,
      maxBoundsViscosity: 0.9,
      zoomControl: false, // Usamos controles flotantes propios estilo PedidosYa para no chocar con el HUD superior
    });

    // Solo descarga tiles dentro del área operativa de Gran Jujuy (+10 km de margen)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      minZoom: 11,
      maxZoom: 18,
      bounds: GRAN_JUJUY_BOUNDS,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Centrar el mapa al cambiar de zona
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeMacro = JUJUY_MACRO_ZONES[selectedZone];
    if (activeMacro) {
      map.flyTo(activeMacro.center, activeMacro.zoom, {
        duration: 0.75,
      });
    }
  }, [selectedZone]);

  // Mover cámara cuando el usuario elige un barrio específico o toca una alerta
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSubzoneCoords) return;
    map.flyTo(selectedSubzoneCoords, 15, { duration: 0.65 });
  }, [selectedSubzoneCoords]);

  // Renderizar pines de alertas activas
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    alerts.forEach((a) => {
      if (typeof a.lat !== 'number' || typeof a.lng !== 'number') return;
      const pinType = a.mapPinType || a.type || 'critical';
      const marker = L.marker([a.lat, a.lng], {
        icon: createPinIcon(pinType, false),
      });

      marker.bindPopup(buildPinPopupHtml(a));
      marker.on('click', () => {
        if (onSelectPinRef.current) {
          onSelectPinRef.current(a);
        }
      });

      marker.addTo(layer);
    });
  }, [alerts]);

  // Modo colocar alerta: habilita el pin arrastrable en el centro del mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    if (isPlacingPin) {
      const center = map.getCenter();
      const marker = L.marker([center.lat, center.lng], {
        icon: createPinIcon('temp', true),
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // Al terminar de arrastrar y soltar el pin en el mapa, abre el menú de opciones
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        if (onPinPlacedRef.current) {
          onPinPlacedRef.current({
            lat: Number(pos.lat.toFixed(5)),
            lng: Number(pos.lng.toFixed(5)),
          });
        }
      });

      tempMarkerRef.current = marker;
    }
  }, [isPlacingPin]);

  const handleConfirmCurrentCenterPin = () => {
    const marker = tempMarkerRef.current;
    if (!marker || !onPinPlacedRef.current) return;
    const pos = marker.getLatLng();
    onPinPlacedRef.current({
      lat: Number(pos.lat.toFixed(5)),
      lng: Number(pos.lng.toFixed(5)),
    });
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenterZone = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const target =
      selectedSubzoneCoords ||
      JUJUY_MACRO_ZONES[selectedZone]?.center || [-24.1875, -65.2965];
    map.flyTo(target, selectedSubzoneCoords ? 15 : 14, { duration: 0.6 });
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Lienzo interactivo de Leaflet ocupando todo el fondo */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Controles flotantes laterales de Zoom y Centrado (estilo PedidosYa Rider) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-2 pointer-events-none">
        <button
          type="button"
          onClick={handleRecenterZone}
          className="pointer-events-auto w-10 h-10 rounded-full bg-surface-container-lowest/95 text-primary shadow-md border border-surface-container flex items-center justify-center active:scale-90 transition-transform"
          title="Centrar en zona actual"
        >
          <span className="material-symbols-outlined text-xl">my_location</span>
        </button>
        <div className="pointer-events-auto flex flex-col rounded-2xl bg-surface-container-lowest/95 text-on-surface shadow-md border border-surface-container overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-9 flex items-center justify-center hover:bg-surface-container-low active:bg-surface-container transition-colors border-b border-surface-container"
            title="Acercar mapa"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-9 flex items-center justify-center hover:bg-surface-container-low active:bg-surface-container transition-colors"
            title="Alejar mapa"
          >
            <span className="material-symbols-outlined text-lg">remove</span>
          </button>
        </div>
      </div>

      {/* Barra Flotante sobre el Mapa cuando se está arrastrando el pin para Agregar Alerta */}
      {isPlacingPin && (
        <div className="absolute top-28 left-3 right-3 z-[450] flex items-center justify-between gap-2 pointer-events-none animate-in fade-in duration-150">
          <div className="pointer-events-auto w-full bg-inverse-surface/95 text-inverse-on-surface px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2 border border-white/10">
            <div className="min-w-0">
              <span className="font-label-sm text-label-sm text-tertiary-fixed block uppercase font-extrabold">
                📍 Arrastrá y soltá el pin al lugar exacto
              </span>
              <span className="font-body-sm text-body-sm text-inverse-on-surface/80 truncate block">
                Al soltar el pin se abrirá el menú de opciones
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleConfirmCurrentCenterPin}
                className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-extrabold shadow-sm active:scale-95 transition-transform"
              >
                Colocar Aquí
              </button>
              <button
                type="button"
                onClick={onCancelPlacing}
                className="w-7 h-7 rounded-full bg-white/15 text-inverse-on-surface flex items-center justify-center active:scale-90"
                title="Cancelar"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
