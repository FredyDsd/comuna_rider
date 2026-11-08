import React, { useEffect, useRef, useState } from 'react';
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
    warning: '#f59e0b',
    weather: '#0284c7',
    security: '#4f46e5',
    sos: '#dc2626',
    temp: '#151c27',
  };
  const bg = isTemp ? colors.temp : colors[type] || colors.critical;
  const emoji = isTemp
    ? '📍'
    : type === 'critical'
    ? '🚓'
    : type === 'weather'
    ? '🌊'
    : type === 'warning'
    ? '⚠️'
    : type === 'sos'
    ? '🚨'
    : '🛡️';

  return L.divIcon({
    className: 'custom-jujuy-pin',
    html: isTemp
      ? `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-14px);">
          <div style="background:#151c27;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;white-space:nowrap;margin-bottom:3px;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
            👆 Arrastrame al lugar
          </div>
          <div style="
            width: 42px;
            height: 42px;
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
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: ${bg};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.32);
        ">${emoji}</div>`,
    iconSize: isTemp ? [130, 64] : [34, 34],
    iconAnchor: isTemp ? [65, 58] : [17, 34],
    popupAnchor: [0, -32],
  });
}

export default function JujuyMap({
  selectedZone = 'Centro y Barrios',
  selectedSubzoneCoords = null,
  alerts = [],
  isPlacingPin = false,
  onPinPlaced,
  onCancelPlacing,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const zonesLayerRef = useRef(null);
  const tempMarkerRef = useRef(null);
  const onPinPlacedRef = useRef(onPinPlaced);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    onPinPlacedRef.current = onPinPlaced;
  }, [onPinPlaced]);

  // Inicializar mapa Leaflet con bloqueo estricto fuera de Jujuy / Palpalá
  // Sin colocar pines al tocar el mapa
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
      zoomControl: true,
    });

    // Solo descarga tiles dentro del área operativa de Gran Jujuy (+10 km de margen)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      minZoom: 11,
      maxZoom: 18,
      bounds: GRAN_JUJUY_BOUNDS,
    }).addTo(map);

    const zonesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);
    zonesLayerRef.current = zonesLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Centrar el mapa al cambiar de zona (sin dibujar recuadros sobre las calles)
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

  // Mover cámara cuando el usuario elige un barrio específico dentro de la zona
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSubzoneCoords) return;
    map.flyTo(selectedSubzoneCoords, 15, { duration: 0.65 });
  }, [selectedSubzoneCoords]);

  // Recalcular tamaño cuando el usuario expande/contrae el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setTimeout(() => {
      map.invalidateSize();
    }, 220);
  }, [isExpanded]);

  // Renderizar pines de alertas activas
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    alerts.forEach((a) => {
      if (typeof a.lat !== 'number' || typeof a.lng !== 'number') return;
      const marker = L.marker([a.lat, a.lng], {
        icon: createPinIcon(a.type, false),
      });

      marker.bindPopup(
        `<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 170px;">
          <div style="font-size: 10px; font-weight: 800; color: #ea0029; text-transform: uppercase;">${a.badge}</div>
          <div style="font-size: 13px; font-weight: 700; color: #151c27; margin-top: 2px;">${a.title}</div>
          <div style="font-size: 11px; color: #575e70; margin-top: 4px;">${a.desc}</div>
        </div>`
      );

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

  return (
    <div
      className={`relative z-10 isolate w-full ${
        isExpanded ? 'h-96' : 'h-72'
      } rounded-xl overflow-hidden shadow-sm border ${
        isPlacingPin ? 'border-primary ring-2 ring-primary/30' : 'border-surface-container'
      } transition-all duration-200`}
    >
      {/* Lienzo interactivo de Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Botón Superior Derecho (sin tapar los controles +/- de la izquierda) */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center justify-end pointer-events-none">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="pointer-events-auto px-2.5 py-1 rounded-full bg-surface-container-lowest/95 text-on-surface shadow-md font-label-sm text-label-sm font-bold flex items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-sm">
            {isExpanded ? 'close_fullscreen' : 'open_in_full'}
          </span>
          {isExpanded ? 'Achicar' : 'Ampliar Mapa'}
        </button>
      </div>

      {/* Barra Inferior Flotante sobre el Mapa (Solo aparece cuando se activa Agregar Alerta) */}
      {isPlacingPin && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto w-full bg-inverse-surface/95 text-inverse-on-surface px-3 py-2 rounded-xl shadow-lg flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-label-sm text-label-sm text-tertiary-fixed block uppercase font-extrabold">
                📍 Arrastrá y soltá el pin en el mapa
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
