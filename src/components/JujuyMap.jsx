import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const JUJUY_ZONES_COORDS = {
  Centro: [-24.1858, -65.2995],
  'Alto Comedero': [-24.2345, -65.261],
  'Nueva Terminal': [-24.2125, -65.276],
  Cuyaya: [-24.189, -65.3135],
  Chijra: [-24.1695, -65.2865],
  'La Viña': [-24.162, -65.278],
  'Los Perales': [-24.1725, -65.3085],
  Palpalá: [-24.2565, -65.2115],
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
    html: `<div style="
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
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

export default function JujuyMap({
  selectedZone = 'Centro',
  alerts = [],
  pickedCoords,
  onPickCoords,
  onOpenReportWithCoords,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tempMarkerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Inicializar mapa Leaflet centrado en San Salvador de Jujuy
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = JUJUY_ZONES_COORDS[selectedZone] || JUJUY_ZONES_COORDS.Centro;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Al tocar un punto del mapa: coloca un marcador en ese lugar sin bloquear la navegación
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (onPickCoords) {
        onPickCoords({
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
        });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Volar suavemente cuando cambia la zona seleccionada
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const coords = JUJUY_ZONES_COORDS[selectedZone];
    if (coords) {
      map.flyTo(coords, 14, { duration: 0.8 });
    }
  }, [selectedZone]);

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

  // Mostrar pin temporal cuando el usuario toca una calle en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    if (pickedCoords?.lat && pickedCoords?.lng) {
      const marker = L.marker([pickedCoords.lat, pickedCoords.lng], {
        icon: createPinIcon('temp', true),
      }).addTo(map);
      tempMarkerRef.current = marker;
    }
  }, [pickedCoords]);

  return (
    <div
      className={`relative z-10 isolate w-full ${
        isExpanded ? 'h-80' : 'h-56'
      } rounded-xl overflow-hidden shadow-sm border border-surface-container transition-all duration-200`}
    >
      {/* Lienzo interactivo de Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Controles Superiores Flotantes (no bloquean el arrastre del mapa) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] flex items-center justify-between pointer-events-none">
        <span className="pointer-events-auto px-2.5 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-md font-label-sm text-label-sm text-on-surface shadow-sm flex items-center gap-1 font-bold">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          {alerts.length} Pines en Jujuy
        </span>

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

      {/* Barra Inferior Flotante sobre el Mapa */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[400] flex items-center justify-between gap-2 pointer-events-none">
        {pickedCoords ? (
          <div className="pointer-events-auto w-full bg-inverse-surface/95 text-inverse-on-surface px-3 py-2 rounded-xl shadow-lg flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-label-sm text-label-sm text-tertiary-fixed block uppercase font-extrabold">
                📍 Punto seleccionado en el mapa
              </span>
              <span className="font-body-sm text-body-sm text-inverse-on-surface/80 truncate block">
                Lat {pickedCoords.lat} • Lng {pickedCoords.lng}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenReportWithCoords(pickedCoords)}
              className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-extrabold shadow-sm active:scale-95 transition-transform flex-shrink-0 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add_location_alt</span>
              Agregar Pin Aquí
            </button>
          </div>
        ) : (
          <div className="pointer-events-none px-2.5 py-1 rounded-full bg-inverse-surface/80 text-inverse-on-surface font-label-sm text-label-sm backdrop-blur-sm">
            Arrastrá para navegar • Tocá una calle para marcar un punto
          </div>
        )}
      </div>
    </div>
  );
}

