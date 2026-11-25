import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import JujuyMap, { JUJUY_MACRO_ZONES, JUJUY_ZONES_COORDS } from '../components/JujuyMap';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SHEET_COLLAPSED_PX = 128;

// Duraciones base automáticas por tipo de alerta
const TTL_BY_SUBTYPE = {
  control: 2.5 * HOUR_MS, // 2h 30m
  lluvia: 5 * HOUR_MS,    // 5 horas
  obra: 10 * DAY_MS,      // 10 días
  sos: 1.5 * HOUR_MS,     // 90 minutos
};

const nowTs = () => Date.now();

function getInitialSeeds() {
  const t = nowTs();
  return {
    controles: [
      {
        id: 'seed-ctrl-1',
        layer: 'controles',
        subType: 'control',
        type: 'critical',
        mapPinType: 'controles',
        badge: '🚓 Control Policial y Grúa • Dura ~2h 30m',
        time: 'Hace 12 min',
        title: 'Rotonda Chango Más / Coronel Arias',
        desc: 'Operativo fuerte y grúa municipal activa. Pidiendo seguro al día, casco reglamentario y VTV.',
        confirmCount: 14,
        dismissVotes: 0,
        verified: true,
        author: 'Cadete: Nico R. (Moto)',
        category: 'gruas',
        zone: 'Centro y Barrios',
        lat: -24.1985,
        lng: -65.2912,
        expiresAt: t + 2 * HOUR_MS + 18 * 60 * 1000,
      },
      {
        id: 'seed-ctrl-2',
        layer: 'controles',
        subType: 'control',
        type: 'warning',
        mapPinType: 'controles',
        badge: '🚓 Operativo Vial • Dura ~2h 30m',
        time: 'Hace 27 min',
        title: 'Acceso Sur / Nueva Terminal y Av. Forestal',
        desc: 'Control caminera en colectora Ruta 9 altura pasarela Sargento Cabral. Pidiendo cédula y luces.',
        confirmCount: 16,
        dismissVotes: 0,
        verified: true,
        author: 'Cadete: Franco L.',
        category: 'gruas',
        zone: 'Alto Comedero',
        lat: -24.2345,
        lng: -65.261,
        expiresAt: t + 2 * HOUR_MS,
      },
      {
        id: 'seed-ctrl-3',
        layer: 'controles',
        subType: 'control',
        type: 'critical',
        mapPinType: 'controles',
        badge: '🚓 Tránsito Municipal • Palpalá',
        time: 'Hace 31 min',
        title: 'Av. Martijena esq. Libertad (Palpalá)',
        desc: 'Control municipal frente a la rotonda de acceso a Palpalá. Precaución al doblar.',
        confirmCount: 11,
        dismissVotes: 0,
        verified: true,
        author: 'Comunidad Cadetes Palpalá',
        category: 'gruas',
        zone: 'Palpalá',
        lat: -24.2565,
        lng: -65.2115,
        expiresAt: t + 1.8 * HOUR_MS,
      },
    ],
    calles: [
      {
        id: 'seed-calle-1',
        layer: 'calles',
        subType: 'lluvia',
        type: 'weather',
        mapPinType: 'calles',
        badge: '🌊 Badén / Lluvia • Expira en ~5h',
        time: 'Hace 22 min',
        title: 'Colectora Suipacha / Chijra y Los Perales',
        desc: 'Badén crecido con arrastre de barro por lluvia. Desvío sugerido por Puente Senador Pérez.',
        confirmCount: 21,
        dismissVotes: 0,
        verified: false,
        extraText: 'Desvío +4 min',
        category: 'lluvia',
        zone: 'Centro y Barrios',
        lat: -24.171,
        lng: -65.2878,
        expiresAt: t + 4.5 * HOUR_MS,
      },
      {
        id: 'seed-calle-2',
        layer: 'calles',
        subType: 'obra',
        type: 'weather',
        mapPinType: 'calles',
        badge: '🚧 Calle Rota / Obra • Dura 10 días',
        time: 'Hace 2 días',
        title: 'Av. Almirante Brown altura 1100 (Media Calzada)',
        desc: 'Bache profundo y obra de agua potable señalizada con vallas. Precaución de noche.',
        confirmCount: 19,
        dismissVotes: 0,
        verified: true,
        extraText: 'Obra prolongada',
        category: 'lluvia',
        zone: 'Centro y Barrios',
        lat: -24.196,
        lng: -65.2918,
        expiresAt: t + 8 * DAY_MS,
      },
      {
        id: 'seed-calle-3',
        layer: 'calles',
        subType: 'obra',
        type: 'weather',
        mapPinType: 'calles',
        badge: '🚧 Calzada Dañada • Alto Comedero',
        time: 'Hace 1 día',
        title: 'Av. Forestal esq. Snopek (Pozo sin tapa)',
        desc: 'Asfalto roto en esquina muy transitada por motos, evitar carril derecho.',
        confirmCount: 9,
        dismissVotes: 0,
        verified: true,
        category: 'lluvia',
        zone: 'Alto Comedero',
        lat: -24.2412,
        lng: -65.2578,
        expiresAt: t + 9 * DAY_MS,
      },
    ],
    // Agenda Estable Permanente (No se borran con el tiempo; negocios de Jujuy en Google Maps)
    gomerias: [
      {
        id: 'seed-gom-1',
        layer: 'gomerias',
        subType: 'gomeria_estable',
        type: 'gomerias',
        mapPinType: 'gomerias',
        badge: '24 HS • Google Maps',
        title: 'Gomería El Chaqueño (Moto & Bici)',
        desc: 'Parche vulcanizado, válvulas y calibrado. 15% OFF con mochila PeYa.',
        address: 'Av. Almirante Brown 1420 • San Pedrito / Arias',
        hours: 'Abierto 24 Horas',
        phone: '+5493884123456',
        zone: 'Centro y Barrios',
        lat: -24.1974,
        lng: -65.2886,
        isPermanent: true,
        expiresAt: null,
      },
      {
        id: 'seed-gom-2',
        layer: 'gomerias',
        subType: 'gomeria_estable',
        type: 'gomerias',
        mapPinType: 'gomerias',
        badge: 'REPUESTOS • Google Maps',
        title: 'Repuestos San Salvador (Centro / Chijra)',
        desc: 'Piñones, cadenas reforzadas, cables de embrague, bujías y cámaras 110cc/150cc.',
        address: 'Calle Iguazú esq. Ayacucho • Centro',
        hours: 'Lun a Sáb 08:30 - 21:00',
        phone: '+5493884889900',
        zone: 'Centro y Barrios',
        lat: -24.1815,
        lng: -65.2982,
        isPermanent: true,
        expiresAt: null,
      },
      {
        id: 'seed-gom-3',
        layer: 'gomerias',
        subType: 'gomeria_estable',
        type: 'gomerias',
        mapPinType: 'gomerias',
        badge: 'TALLER • Google Maps',
        title: 'Motos & Bici Cuyaya Service',
        desc: 'Regulación de frenos en el acto, estirado de cadena, lubricación y rayos.',
        address: 'Av. Mariano Moreno 840 • Cuyaya',
        hours: 'Hasta 23:00 hs',
        phone: '+5493884665544',
        zone: 'Centro y Barrios',
        lat: -24.1892,
        lng: -65.3115,
        isPermanent: true,
        expiresAt: null,
      },
      {
        id: 'seed-gom-4',
        layer: 'gomerias',
        subType: 'gomeria_estable',
        type: 'gomerias',
        mapPinType: 'gomerias',
        badge: '24 HS RUTA 9 • Google Maps',
        title: 'Gomería 24hs Ruta 9 Alto Comedero',
        desc: 'Emparchado rápido de motos, balanceo, inflación y auxilio en zona Sur.',
        address: 'Colectora Ruta 9 Km 5 • Frente Pasarela',
        hours: 'Abierto 24 Horas',
        phone: '+5493884776655',
        zone: 'Alto Comedero',
        lat: -24.2315,
        lng: -65.2642,
        isPermanent: true,
        expiresAt: null,
      },
      {
        id: 'seed-gom-5',
        layer: 'gomerias',
        subType: 'gomeria_estable',
        type: 'gomerias',
        mapPinType: 'gomerias',
        badge: 'REMOLQUE & GOMERÍA • Google Maps',
        title: 'Taller & Gomería Palpalá Express',
        desc: 'Gomería y mecánica ligera. Auxilio por Ruta 66 y acceso Palpalá.',
        address: 'Av. Martijena 350 • Palpalá',
        hours: '07:00 a 01:00 hs',
        phone: '+5493885112233',
        zone: 'Palpalá',
        lat: -24.2582,
        lng: -65.2095,
        isPermanent: true,
        expiresAt: null,
      },
    ],
    // Agenda Estadística e Historial Colaborativo de Clientes / Direcciones (Exclusivo Delivery Nivel 2+)
    clientes: [
      {
        id: 'seed-cli-1',
        layer: 'clientes',
        subType: 'cliente_historial',
        type: 'clientes',
        mapPinType: 'clientes',
        tag: '🏢 Exige subir al depto',
        badge: '📋 Historial Dirección • Centro',
        title: 'Torre Belgrano 1140 (Edificio)',
        desc: 'El pin marca bien, pero en notas pide subir hasta el 4to piso sin lugar seguro para dejar la moto.',
        zone: 'Centro y Barrios',
        lat: -24.1846,
        lng: -65.3028,
        reportsCount: 7,
        confirmCount: 7,
        isPermanent: true,
        expiresAt: null,
        comments: [
          {
            id: 'c1',
            author: 'Cristian M. (Moto)',
            date: 'Hace 2 días',
            text: 'Siempre pide que subas por ascensor al 4° B aunque la vereda está llena de grúas.',
          },
          {
            id: 'c2',
            author: 'Nico R.',
            date: 'Ayer',
            text: 'Le avisás por chat de la app al salir del local y baja si le insistís.',
          },
        ],
      },
      {
        id: 'seed-cli-2',
        layer: 'clientes',
        subType: 'cliente_historial',
        type: 'clientes',
        mapPinType: 'clientes',
        tag: '📍 Vive 1 cuadra más arriba',
        badge: '📋 Historial Dirección • Alto Comedero',
        title: 'Pasaje 14 y Av. Forestal (Sector B3)',
        desc: 'La app ubica el pin sobre Av. Forestal pero la casa real está una cuadra hacia el cerro.',
        zone: 'Alto Comedero',
        lat: -24.2392,
        lng: -65.2618,
        reportsCount: 5,
        confirmCount: 5,
        isPermanent: true,
        expiresAt: null,
        comments: [
          {
            id: 'c3',
            author: 'Franco L.',
            date: 'Hace 3 días',
            text: 'Pin corrido 100 mts. Subir por el pasaje hasta la despensa "El Sol", portón verde.',
          },
        ],
      },
      {
        id: 'seed-cli-3',
        layer: 'clientes',
        subType: 'cliente_historial',
        type: 'clientes',
        mapPinType: 'clientes',
        tag: '📱 Teléfono mal en la app',
        badge: '📋 Contacto Corregido • Malvinas',
        title: 'B° Malvinas Mza 12 Lote 4',
        desc: 'El número cargado en PedidosYa da apagado. Responde rápido al WhatsApp alternativo.',
        zone: 'Centro y Barrios',
        lat: -24.2068,
        lng: -65.2838,
        reportsCount: 4,
        confirmCount: 4,
        isPermanent: true,
        expiresAt: null,
        comments: [
          {
            id: 'c4',
            author: 'Matías R.',
            date: 'Hace 5 días',
            text: 'Tiene mal cargado el cel en la app, si te toca atendió al toque en 388-471-8890 (esposa).',
          },
        ],
      },
      {
        id: 'seed-cli-4',
        layer: 'clientes',
        subType: 'cliente_historial',
        type: 'clientes',
        mapPinType: 'clientes',
        tag: '⚠️ Cuponero / Reclamo Falso',
        badge: '📋 Alerta Estadística • Palpalá',
        title: 'Av. Hipólito Yrigoyen 230 (Palpalá)',
        desc: 'Varios compañeros reportaron reclamos por "pedido incompleto" después de entregar en mano.',
        zone: 'Palpalá',
        lat: -24.2542,
        lng: -65.2072,
        reportsCount: 6,
        confirmCount: 6,
        isPermanent: true,
        expiresAt: null,
        comments: [
          {
            id: 'c5',
            author: 'Lucas P.',
            date: 'Hace 4 días',
            text: 'Sacar foto nítida con ticket y bolsa abierta al entregar para evitar descuento en el pago.',
          },
        ],
      },
    ],
    sos: [],
  };
}

function parseExtraJson(rawExtra) {
  if (!rawExtra || typeof rawExtra !== 'string') return {};
  if (rawExtra.trim().startsWith('{')) {
    try {
      return JSON.parse(rawExtra);
    } catch {
      return {};
    }
  }
  return { extraText: rawExtra };
}

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return 'Permanente';
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expirada';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Quedan ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const remM = mins % 60;
    return `Quedan ${hrs}h ${remM}m`;
  }
  const days = Math.ceil(hrs / 24);
  return `Quedan ${days} días`;
}

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

function formatArPhone(raw = '') {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '+54 9 388 ';
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '+54 9 388 ';
  if (digits.startsWith('549')) {
    return `+54 9 ${digits.slice(3)}`.trimEnd();
  }
  if (digits.startsWith('54')) {
    const rest = digits.slice(2).replace(/^9/, '');
    return `+54 9 ${rest}`.trimEnd();
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return `+54 9 ${digits}`;
}

function hasRegisteredPhone(raw = '') {
  const digits = (raw || '').replace(/\D/g, '');
  const local = digits.startsWith('549')
    ? digits.slice(3)
    : digits.startsWith('54')
    ? digits.slice(2)
    : digits;
  return local.length >= 8;
}

const CLIENT_TAGS = [
  '🏢 Exige subir al depto',
  '📍 Vive 1 cuadra más arriba',
  '📱 Teléfono mal en la app',
  '⚠️ Cuponero / Reclamo falso',
  '✏️ Otro',
];

const SOS_OPTIONS = [
  {
    id: 'choque',
    urgency: 'grave',
    label: 'Choqué / Caí de la moto',
    icon: 'personal_injury',
    titlePrefix: '💥 ACCIDENTE / CAÍDA EN RUTA',
  },
  {
    id: 'robo',
    urgency: 'grave',
    label: 'Robo / Peligro en zona',
    icon: 'gpp_maybe',
    titlePrefix: '🛑 PELIGRO / SEGURIDAD',
  },
  {
    id: 'pinchadura',
    urgency: 'mecanico',
    label: 'Pinché rueda',
    icon: 'tire_repair',
    titlePrefix: '🛞 PINCHADURA',
  },
  {
    id: 'nafta',
    urgency: 'mecanico',
    label: 'Sin nafta',
    icon: 'local_gas_station',
    titlePrefix: '⛽ SIN NAFTA',
  },
  {
    id: 'cadena',
    urgency: 'mecanico',
    label: 'Cadena / Cable cortado',
    icon: 'link_off',
    titlePrefix: '⛓️ FALLA DE CADENA / CABLE',
  },
  {
    id: 'bateria',
    urgency: 'mecanico',
    label: 'No arranca / Eléctrico',
    icon: 'battery_alert',
    titlePrefix: '🔋 NO ARRANCA',
  },
  {
    id: 'relevo',
    urgency: 'mecanico',
    label: 'Relevo con pedido activo',
    icon: 'inventory_2',
    titlePrefix: '📦 RELEVO CON PEDIDO',
  },
];

export default function MapaPage() {
  const navigate = useNavigate();
  const { user, profile, canWriteMap, canUseCadeteTools, isAdmin, updateProfile } = useAuth();

  const [selectedZone, setSelectedZone] = useState('Centro y Barrios');
  const [selectedSubzone, setSelectedSubzone] = useState('Microcentro');
  const [selectedSubzoneCoords, setSelectedSubzoneCoords] = useState(null);
  const [isShowingSubzones, setIsShowingSubzones] = useState(false);

  // Capas separadas (NUNCA mezcladas): 'controles' | 'calles' | 'gomerias' | 'clientes' | 'sos'
  const [activeLayer, setActiveLayer] = useState('controles');

  // Datos combinados (semillas + Supabase + ediciones locales)
  const [seeds] = useState(() => getInitialSeeds());
  const [dbItems, setDbItems] = useState([]);
  const [localExtrasById, setLocalExtrasById] = useState(() => {
    try {
      const saved = localStorage.getItem('comuna_rider_local_overrides_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [confirmedItems, setConfirmedItems] = useState({});
  const [dismissedByMe, setDismissedByMe] = useState({});

  // Estado UI de barra deslizable, clima y modales
  const containerRef = useRef(null);
  const [sheetHeightPx, setSheetHeightPx] = useState(SHEET_COLLAPSED_PX);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetDragRef = useRef({
    active: false,
    startY: 0,
    startHeight: SHEET_COLLAPSED_PX,
    moved: false,
  });

  const [pickedCoords, setPickedCoords] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);

  // Formulario al soltar pin ("Agregar Alerta")
  const [reportLayer, setReportLayer] = useState('controles');
  const [reportSubType, setReportSubType] = useState('control'); // 'control' | 'lluvia' | 'obra' | 'gomeria_estable' | 'cliente_historial'
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportHours, setReportHours] = useState('08:00 a 22:00');
  const [reportPhone, setReportPhone] = useState('+549388');
  const [reportClientTag, setReportClientTag] = useState(CLIENT_TAGS[0]);
  const [customClientTag, setCustomClientTag] = useState('');

  // Historial de Clientes: input inline para agregar experiencia a una dirección existente
  const [commentingItemId, setCommentingItemId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Sistema SOS completo (Exclusivo canUseCadeteTools)
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [selectedSosOption, setSelectedSosOption] = useState(SOS_OPTIONS[2]); // default pinchadura
  const [sosNote, setSosNote] = useState('');
  const [sosPhone, setSosPhone] = useState('+54 9 388 ');
  const [isEditingSosPhone, setIsEditingSosPhone] = useState(false);
  const [sosCoords, setSosCoords] = useState(null);
  const [sosAddress, setSosAddress] = useState('');
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'locating' | 'ready' | 'manual' | 'error'
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');
  const [isPickingSosOnMap, setIsPickingSosOnMap] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [lastSentSos, setLastSentSos] = useState(null);

  // Clima
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

  useEffect(() => {
    if (hasRegisteredPhone(profile?.whatsapp)) {
      setSosPhone(formatArPhone(profile.whatsapp));
    }
  }, [profile?.whatsapp]);

  // Si un usuario baja de nivel a N1 y estaba viendo Clientes o SOS, lo pasamos a Controles
  useEffect(() => {
    if (!canUseCadeteTools && (activeLayer === 'clientes' || activeLayer === 'sos')) {
      setActiveLayer('controles');
    }
  }, [canUseCadeteTools, activeLayer]);

  const saveLocalOverride = useCallback((id, patch) => {
    setLocalExtrasById((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...patch } };
      try {
        localStorage.setItem('comuna_rider_local_overrides_v1', JSON.stringify(next));
      } catch {
        // Ignora errores de cuota en storage
      }
      return next;
    });
  }, []);

  const macroZonesList = Object.values(JUJUY_MACRO_ZONES);
  const currentMacroZone =
    JUJUY_MACRO_ZONES[selectedZone] || JUJUY_MACRO_ZONES['Centro y Barrios'];

  const getMaxSheetHeight = useCallback(() => {
    const h = containerRef.current?.clientHeight || window.innerHeight - 128;
    return Math.max(320, Math.round(h * 0.84));
  }, []);

  const getHalfSheetHeight = useCallback(() => {
    const h = containerRef.current?.clientHeight || window.innerHeight - 128;
    return Math.max(250, Math.round(h * 0.5));
  }, []);

  // Gestos del Bottom Sheet
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

    setSheetHeightPx((currentH) => {
      const delta = currentH - startH;
      if (delta > 45) return currentH > halfH + 30 ? maxH : halfH;
      if (delta < -45) return currentH < halfH - 20 ? SHEET_COLLAPSED_PX : halfH;
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

  // Cargar alertas desde Supabase y mapearlas a sus capas separadas
  const fetchAlerts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((row) => {
          const parsed = parseExtraJson(row.extra);
          const createdMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
          let layer = 'controles';
          let mapPinType = 'controles';
          let subType = parsed.subType || 'control';
          let defaultExpires = createdMs + TTL_BY_SUBTYPE.control;

          if (row.category === 'sos' || row.type === 'sos') {
            layer = 'sos';
            mapPinType = 'sos';
            subType = 'sos';
            defaultExpires = createdMs + TTL_BY_SUBTYPE.sos;
          } else if (row.category === 'cuponeros') {
            layer = 'clientes';
            mapPinType = 'clientes';
            subType = 'cliente_historial';
            defaultExpires = null;
          } else if (row.category === 'gomeria') {
            layer = 'gomerias';
            mapPinType = 'gomerias';
            subType = 'gomeria_estable';
            defaultExpires = null;
          } else if (row.category === 'lluvia') {
            layer = 'calles';
            mapPinType = 'calles';
            subType = parsed.subType === 'obra' ? 'obra' : 'lluvia';
            defaultExpires =
              createdMs + (subType === 'obra' ? TTL_BY_SUBTYPE.obra : TTL_BY_SUBTYPE.lluvia);
          }

          return {
            id: row.id,
            user_id: row.user_id,
            layer,
            subType,
            type: layer === 'gomerias' || layer === 'clientes' ? layer : row.type || 'critical',
            mapPinType,
            badge: row.badge || 'Alerta Jujuy',
            time: parsed.eventTime || 'Reciente',
            title: row.title,
            desc: row.description,
            confirmCount: row.confirm_count ?? 1,
            dismissVotes: parsed.dismissVotes ?? 0,
            verified: row.verified ?? true,
            author: row.author_name ? `Por: ${row.author_name}` : undefined,
            category: row.category,
            zone: row.zone || 'Centro',
            lat: typeof row.lat === 'number' ? row.lat : -24.1858,
            lng: typeof row.lng === 'number' ? row.lng : -65.2995,
            expiresAt: parsed.expiresAt !== undefined ? parsed.expiresAt : defaultExpires,
            isPermanent: layer === 'gomerias' || layer === 'clientes',
            // Campos específicos de Gomería / Cliente / SOS
            address: parsed.address || row.zone,
            hours: parsed.hours || 'Consultar horario',
            phone: parsed.phone || '',
            tag: parsed.tag || CLIENT_TAGS[0],
            reportsCount: parsed.reportsCount ?? row.confirm_count ?? 1,
            comments: Array.isArray(parsed.comments) ? parsed.comments : [],
            urgency: parsed.urgency || 'mecanico',
            helpers: Array.isArray(parsed.helpers) ? parsed.helpers : [],
            extraText: parsed.extraText,
            isFromDb: true,
          };
        });
        setDbItems(mapped);
      }
    } catch (err) {
      console.warn('Error cargando alertas desde Supabase:', err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('public:alerts:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        fetchAlerts();
        if (
          payload.eventType === 'INSERT' &&
          payload.new?.category === 'sos' &&
          payload.new?.user_id !== user?.id
        ) {
          try {
            navigator.vibrate?.([250, 120, 250]);
          } catch {
            // Vibra solo si el dispositivo/navegador lo soporta
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts, user?.id]);

  // Construir las 5 listas limpias combinando Supabase + Semillas + Overrides locales + Filtro de expiración
  const getItemsForLayer = useCallback(
    (layerKey) => {
      const now = Date.now();
      const combined = [
        ...dbItems.filter((item) => item.layer === layerKey),
        ...(seeds[layerKey] || []),
      ];

      return combined
        .map((item) => {
          const override = localExtrasById[item.id];
          return override ? { ...item, ...override } : item;
        })
        .filter((item) => {
          if (item.deleted) return false;
          if (!item.isPermanent && item.expiresAt && item.expiresAt <= now) return false;
          if (!item.isPermanent && (item.dismissVotes || 0) >= 2 && item.subType !== 'obra') {
            return false;
          }
          if (item.subType === 'obra' && (item.dismissVotes || 0) >= 3) {
            return false;
          }
          return true;
        });
    },
    [dbItems, seeds, localExtrasById]
  );

  const controlesItems = getItemsForLayer('controles');
  const callesItems = getItemsForLayer('calles');
  const gomeriasItems = getItemsForLayer('gomerias');
  const clientesItems = canUseCadeteTools ? getItemsForLayer('clientes') : [];
  const sosItems = canUseCadeteTools ? getItemsForLayer('sos') : [];

  const activeLayerItems =
    activeLayer === 'controles'
      ? controlesItems
      : activeLayer === 'calles'
      ? callesItems
      : activeLayer === 'gomerias'
      ? gomeriasItems
      : activeLayer === 'clientes' && canUseCadeteTools
      ? clientesItems
      : activeLayer === 'sos' && canUseCadeteTools
      ? sosItems
      : controlesItems;

  // Clima SMN / Open-Meteo
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
        // Mantiene último estado válido
      }
    }

    loadWeather();
    return () => {
      active = false;
    };
  }, [selectedZone, selectedSubzoneCoords, currentMacroZone.center]);

  const resetWeatherIdleTimer = useCallback(() => {
    if (weatherIdleTimerRef.current) clearTimeout(weatherIdleTimerRef.current);
    weatherIdleTimerRef.current = setTimeout(() => {
      setIsWeatherExpanded(false);
    }, 25000);
  }, []);

  useEffect(() => {
    if (!isWeatherExpanded) {
      if (weatherIdleTimerRef.current) clearTimeout(weatherIdleTimerRef.current);
      return;
    }
    resetWeatherIdleTimer();
    return () => {
      if (weatherIdleTimerRef.current) clearTimeout(weatherIdleTimerRef.current);
    };
  }, [isWeatherExpanded, resetWeatherIdleTimer]);

  // Iniciar colocación de pin arrastrable
  const handleStartAddAlert = () => {
    if (!canWriteMap) {
      if (
        window.confirm(
          '🔒 Para agregar alertas o puntos al mapa debés iniciar sesión (Nivel 1 Ciudadano o Delivery Verificado). ¿Ir a Mi Perfil?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    setSheetHeightPx(SHEET_COLLAPSED_PX);
    setIsWeatherExpanded(false);
    setIsPlacingPin((prev) => !prev);
  };

  const applyPresetByLayer = (layerChoice) => {
    if (layerChoice === 'controles') {
      setReportLayer('controles');
      setReportSubType('control');
      setReportTitle(`Control Vial / ${selectedSubzone}`);
      setReportDesc('');
    } else if (layerChoice === 'calles_lluvia') {
      setReportLayer('calles');
      setReportSubType('lluvia');
      setReportTitle(`Badén / Anegamiento (${selectedSubzone})`);
      setReportDesc('Calle con agua acumulada o barro. Circular con precaución.');
    } else if (layerChoice === 'calles_obra') {
      setReportLayer('calles');
      setReportSubType('obra');
      setReportTitle(`Calle Rota / Obra (${selectedSubzone})`);
      setReportDesc('Asfalto dañado o calzada reducida por obra en construcción.');
    } else if (layerChoice === 'gomerias') {
      setReportLayer('gomerias');
      setReportSubType('gomeria_estable');
      setReportTitle('');
      setReportDesc('Gomería / Taller mecánico para motos y bicis.');
      setReportHours('08:00 a 22:00');
      setReportPhone('+549388');
    } else if (layerChoice === 'clientes') {
      setReportLayer('clientes');
      setReportSubType('cliente_historial');
      setReportTitle('');
      setReportDesc('');
      setReportClientTag(CLIENT_TAGS[0]);
      setCustomClientTag('');
    }
  };

  const resolveReverseAddress = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`
      );
      if (!res.ok) return '';
      const data = await res.json();
      const addr = data?.address || {};
      const road = addr.road || addr.pedestrian || '';
      const house = addr.house_number ? ` ${addr.house_number}` : '';
      const barrio = addr.neighbourhood || addr.suburb || addr.quarter || '';
      const compact = [road ? `${road}${house}` : '', barrio].filter(Boolean).join(', ');
      return compact || data?.display_name?.split(',').slice(0, 2).join(',').trim() || '';
    } catch {
      return '';
    }
  }, []);

  const handlePinPlaced = async (coords) => {
    setIsPlacingPin(false);
    if (isPickingSosOnMap) {
      setIsPickingSosOnMap(false);
      setSosCoords({ lat: coords.lat, lng: coords.lng, accuracy: null });
      setGpsStatus('manual');
      setGpsErrorMsg('');
      setSelectedSubzoneCoords([coords.lat, coords.lng]);
      setIsSosModalOpen(true);
      const addrText = await resolveReverseAddress(coords.lat, coords.lng);
      if (addrText) setSosAddress(addrText);
      return;
    }

    setPickedCoords(coords);
    if (activeLayer === 'calles') applyPresetByLayer('calles_lluvia');
    else if (activeLayer === 'gomerias') applyPresetByLayer('gomerias');
    else if (activeLayer === 'clientes' && canUseCadeteTools) applyPresetByLayer('clientes');
    else applyPresetByLayer('controles');
    setIsReportModalOpen(true);
  };

  const handlePublishAlert = async () => {
    if (!canWriteMap || !user) {
      navigate('/perfil');
      return;
    }
    if (!reportTitle.trim()) {
      alert('Ingresá una ubicación, nombre o dirección antes de publicar.');
      return;
    }

    setSavingAlert(true);
    const authorName =
      profile?.full_name ||
      user.email?.split('@')[0] ||
      (canUseCadeteTools ? 'Cadete Verificado' : 'Vecino Jujuy');
    const authorRoleLabel = canUseCadeteTools ? 'Delivery' : 'Vecino';
    const vehicle = canUseCadeteTools ? profile?.vehicle || 'Moto' : 'Ciudadano';
    const defaultCoords =
      selectedSubzoneCoords || JUJUY_ZONES_COORDS[selectedZone] || [-24.1858, -65.2995];
    const finalLat = pickedCoords?.lat ?? defaultCoords[0];
    const finalLng = pickedCoords?.lng ?? defaultCoords[1];

    let category = 'gruas';
    let type = 'critical';
    let badge = '🚓 Control Policial • 2h 30m';
    let expiresAt = Date.now() + TTL_BY_SUBTYPE.control;
    let extraObj = { subType: 'control', expiresAt, dismissVotes: 0 };

    if (reportLayer === 'calles') {
      category = 'lluvia';
      type = 'weather';
      if (reportSubType === 'obra') {
        badge = '🚧 Calle Rota / Obra • 10 días';
        expiresAt = Date.now() + TTL_BY_SUBTYPE.obra;
        extraObj = { subType: 'obra', expiresAt, dismissVotes: 0 };
      } else {
        badge = '🌊 Badén / Lluvia • 5 horas';
        expiresAt = Date.now() + TTL_BY_SUBTYPE.lluvia;
        extraObj = { subType: 'lluvia', expiresAt, dismissVotes: 0 };
      }
    } else if (reportLayer === 'gomerias') {
      category = 'gomeria';
      type = 'warning';
      badge = `${reportHours.trim() || 'Horario Local'} • Agenda Estable`;
      expiresAt = null;
      extraObj = {
        subType: 'gomeria_estable',
        address: `${selectedSubzone} • ${selectedZone}`,
        hours: reportHours.trim() || 'Consultar horario',
        phone: reportPhone.trim(),
        expiresAt: null,
      };
    } else if (reportLayer === 'clientes' && canUseCadeteTools) {
      const resolvedClientTag =
        reportClientTag === '✏️ Otro'
          ? customClientTag.trim() || '✏️ Otro motivo'
          : reportClientTag;
      category = 'cuponeros';
      type = 'security';
      badge = `📋 Historial Dirección • ${selectedZone}`;
      expiresAt = null;
      extraObj = {
        subType: 'cliente_historial',
        tag: resolvedClientTag,
        reportsCount: 1,
        comments: [
          {
            id: `c-${Date.now()}`,
            author: `${authorName} (${vehicle})`,
            date: 'Recién',
            text: reportDesc.trim() || resolvedClientTag,
          },
        ],
        expiresAt: null,
      };
    }

    const resolvedDescription =
      reportLayer === 'controles'
        ? reportDesc.trim()
        : reportDesc.trim() ||
          (reportLayer === 'clientes'
            ? extraObj.tag
            : `Reportado por ${authorRoleLabel}: ${authorName}.`);

    const newDbRow = {
      user_id: user.id,
      author_name: `${authorName} (${vehicle})`,
      vehicle,
      type,
      category,
      badge,
      title: reportTitle.trim(),
      description: resolvedDescription,
      zone: selectedZone,
      lat: finalLat,
      lng: finalLng,
      confirm_count: 1,
      verified: canUseCadeteTools,
      extra: JSON.stringify(extraObj),
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('alerts').insert(newDbRow);
        if (error) throw error;
        await fetchAlerts();
      } else {
        const localNew = {
          id: `local-${Date.now()}`,
          user_id: user.id,
          layer: reportLayer,
          subType: extraObj.subType,
          type: reportLayer === 'gomerias' || reportLayer === 'clientes' ? reportLayer : type,
          mapPinType: reportLayer,
          badge,
          time: 'Ahora mismo',
          title: newDbRow.title,
          desc: newDbRow.description,
          confirmCount: 1,
          dismissVotes: 0,
          verified: canUseCadeteTools,
          author: `${authorRoleLabel}: ${authorName}`,
          category,
          zone: selectedZone,
          lat: finalLat,
          lng: finalLng,
          expiresAt,
          isPermanent: expiresAt === null,
          ...extraObj,
        };
        setDbItems((prev) => [localNew, ...prev]);
      }

      setActiveLayer(reportLayer);
      setSheetHeightPx(getHalfSheetHeight());
      setPickedCoords(null);
      setIsReportModalOpen(false);
    } catch (err) {
      alert(`Error al publicar en el mapa: ${err.message}`);
    } finally {
      setSavingAlert(false);
    }
  };

  // Extender vigencia ("Sigue ahí")
  const handleConfirmStillThere = async (item) => {
    if (!canWriteMap) {
      if (window.confirm('Iniciá sesión para confirmar alertas en vivo. ¿Ir a Mi Perfil?')) {
        navigate('/perfil');
      }
      return;
    }
    if (confirmedItems[item.id]) return;

    const nextCount = (item.confirmCount || 1) + 1;
    let nextExpiresAt = item.expiresAt;
    if (item.subType === 'control') {
      nextExpiresAt = Math.max(Date.now(), item.expiresAt || Date.now()) + 45 * 60 * 1000;
    } else if (item.subType === 'lluvia') {
      nextExpiresAt = Math.max(Date.now(), item.expiresAt || Date.now()) + 60 * 60 * 1000;
    }

    setConfirmedItems((prev) => ({ ...prev, [item.id]: true }));
    saveLocalOverride(item.id, {
      confirmCount: nextCount,
      expiresAt: nextExpiresAt,
    });

    if (item.isFromDb && isSupabaseConfigured) {
      const updatedExtra = {
        subType: item.subType,
        expiresAt: nextExpiresAt,
        dismissVotes: item.dismissVotes || 0,
      };
      await supabase
        .from('alerts')
        .update({ confirm_count: nextCount, extra: JSON.stringify(updatedExtra) })
        .eq('id', item.id);
    }
  };

  // Votar "Ya se fue" o borrar si es autor/admin
  const handleDismissOrDelete = async (item) => {
    if (!canWriteMap) {
      navigate('/perfil');
      return;
    }
    const isOwnerOrAdmin = user && (item.user_id === user.id || isAdmin);

    // Gomerías y Clientes: SOLO el Moderador Nivel 4 (isAdmin) puede eliminar de la agenda estable
    if (item.isPermanent) {
      if (!isAdmin) return;
      if (!window.confirm(`¿Eliminar "${item.title}" de la agenda permanente (solo Moderador)?`)) {
        return;
      }
      if (item.isFromDb && isSupabaseConfigured) {
        await supabase.from('alerts').delete().eq('id', item.id);
        setDbItems((prev) => prev.filter((d) => d.id !== item.id));
      } else {
        saveLocalOverride(item.id, { deleted: true });
      }
      return;
    }

    if (isOwnerOrAdmin) {
      if (item.isFromDb && isSupabaseConfigured) {
        await supabase.from('alerts').delete().eq('id', item.id);
        setDbItems((prev) => prev.filter((d) => d.id !== item.id));
      } else {
        saveLocalOverride(item.id, { deleted: true });
      }
      return;
    }

    // Voto comunitario "Ya se fue" (con 2 votos en controles/lluvia o 3 en obra, desaparece)
    if (dismissedByMe[item.id]) return;
    const nextDismiss = (item.dismissVotes || 0) + 1;
    setDismissedByMe((prev) => ({ ...prev, [item.id]: true }));
    saveLocalOverride(item.id, { dismissVotes: nextDismiss });

    if (item.isFromDb && isSupabaseConfigured) {
      const updatedExtra = {
        subType: item.subType,
        expiresAt: item.expiresAt,
        dismissVotes: nextDismiss,
      };
      await supabase
        .from('alerts')
        .update({ extra: JSON.stringify(updatedExtra) })
        .eq('id', item.id);
    }
  };

  // Agregar nueva experiencia / comentario estadístico en una dirección de Clientes
  const handleAddClientComment = async (item) => {
    if (!canUseCadeteTools || !user) return;
    const text = newCommentText.trim();
    if (!text) return;

    const riderName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Verificado';
    const nextComments = [
      ...(item.comments || []),
      {
        id: `c-${Date.now()}`,
        author: `${riderName} (${profile?.vehicle || 'Moto'})`,
        date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
        text,
      },
    ];
    const nextReports = (item.reportsCount || item.confirmCount || 1) + 1;

    saveLocalOverride(item.id, {
      comments: nextComments,
      reportsCount: nextReports,
      confirmCount: nextReports,
    });

    if (item.isFromDb && isSupabaseConfigured) {
      const updatedExtra = {
        subType: 'cliente_historial',
        tag: item.tag,
        reportsCount: nextReports,
        comments: nextComments,
        expiresAt: null,
      };
      await supabase
        .from('alerts')
        .update({
          confirm_count: nextReports,
          extra: JSON.stringify(updatedExtra),
        })
        .eq('id', item.id);
    }

    setNewCommentText('');
    setCommentingItemId(null);
  };

  // Captura la ubicación GPS real del delivery (alta precisión + reintento bajo techo + dirección por Nominatim)
  const requestRealGpsLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('Este navegador no soporta geolocalización GPS.');
      return Promise.resolve(null);
    }

    const isNonHttpsLan =
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    setGpsStatus('locating');
    setGpsErrorMsg('');

    const getPos = (options) =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

    return getPos({ enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
      .catch((err) => {
        // Si falla alta precisión bajo techo o tarda demasiado (code 2 o 3), reintenta por red/Wi-Fi
        if (err && (err.code === 2 || err.code === 3)) {
          return getPos({ enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 });
        }
        throw err;
      })
      .then(async (pos) => {
        const nextCoords = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy || 0),
        };
        setSosCoords(nextCoords);
        setGpsStatus('ready');
        setGpsErrorMsg('');
        setSelectedSubzoneCoords([nextCoords.lat, nextCoords.lng]);

        const addrText = await resolveReverseAddress(nextCoords.lat, nextCoords.lng);
        if (addrText) setSosAddress(addrText);
        return { coords: nextCoords, address: addrText };
      })
      .catch((err) => {
        setGpsStatus('error');
        if (isNonHttpsLan) {
          setGpsErrorMsg(
            'El navegador del celular bloquea el GPS en IP local sin HTTPS. Probá en el link HTTPS de Vercel o marcá tu punto exacto en el mapa.'
          );
        } else if (err?.code === 1) {
          setGpsErrorMsg(
            'Permiso de ubicación denegado. Habilitá el GPS para el sitio o marcá tu punto en el mapa.'
          );
        } else {
          setGpsErrorMsg(
            'No se pudo obtener señal GPS en este momento. Reintentá o marcá tu punto en el mapa.'
          );
        }
        return null;
      });
  }, [resolveReverseAddress]);

  const handleOpenSosModal = () => {
    if (!canUseCadeteTools) return;
    const savedWa = profile?.whatsapp || '';
    const hasSaved = hasRegisteredPhone(savedWa);
    setSosPhone(hasSaved ? formatArPhone(savedWa) : '+54 9 388 ');
    setIsEditingSosPhone(!hasSaved);
    setSosNote('');
    setLastSentSos(null);
    setIsPickingSosOnMap(false);
    setIsSosModalOpen(true);
    requestRealGpsLocation();
  };

  const handleStartManualSosPin = () => {
    setIsSosModalOpen(false);
    setIsPickingSosOnMap(true);
    setSheetHeightPx(SHEET_COLLAPSED_PX);
    setIsPlacingPin(true);
  };

  const handleEmitSos = async () => {
    if (!canUseCadeteTools || !user) return;
    setSendingSos(true);

    // Si todavía no había terminado de capturar el GPS real, lo espera antes de emitir
    let resolvedCoords = sosCoords;
    let resolvedAddress = sosAddress;
    if (!resolvedCoords) {
      const gpsRes = await requestRealGpsLocation();
      if (gpsRes?.coords) {
        resolvedCoords = gpsRes.coords;
        resolvedAddress = gpsRes.address || resolvedAddress;
      }
    }

    const riderName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Jujuy';
    const vehicle = profile?.vehicle || 'Moto';
    const timeStr = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const fallbackCoords =
      selectedSubzoneCoords || JUJUY_ZONES_COORDS[selectedZone] || [-24.1858, -65.2995];
    const finalLat = resolvedCoords?.lat ?? fallbackCoords[0];
    const finalLng = resolvedCoords?.lng ?? fallbackCoords[1];
    const isRealGps = Boolean(resolvedCoords);
    const expiresAt = Date.now() + TTL_BY_SUBTYPE.sos;

    const candidatePhone = hasRegisteredPhone(sosPhone)
      ? formatArPhone(sosPhone)
      : hasRegisteredPhone(profile?.whatsapp)
      ? formatArPhone(profile.whatsapp)
      : '';
    const phoneToShare = candidatePhone;

    // Si completó/actualizó su teléfono en este SOS y no lo tenía registrado en Supabase, lo guarda en su perfil
    if (
      phoneToShare &&
      (!hasRegisteredPhone(profile?.whatsapp) || formatArPhone(profile?.whatsapp) !== phoneToShare)
    ) {
      updateProfile({ whatsapp: phoneToShare }).catch(() => {});
    }

    const extraObj = {
      subType: 'sos',
      urgency: selectedSosOption.urgency,
      phone: phoneToShare,
      eventTime: `${timeStr} hs`,
      address: resolvedAddress || '',
      isRealGps,
      accuracy: resolvedCoords?.accuracy || null,
      helpers: [],
      expiresAt,
    };

    const sosTitle = `${selectedSosOption.titlePrefix} • ${riderName} (${vehicle})`;
    const locationText = resolvedAddress
      ? `Calle: ${resolvedAddress}`
      : isRealGps
      ? `GPS real: ${finalLat}, ${finalLng}`
      : `Zona: ${selectedZone} (${selectedSubzone})`;

    const sosDescription = `${sosNote.trim() || selectedSosOption.label}. ${locationText} • Hora: ${timeStr} hs${
      phoneToShare ? ` • WhatsApp: ${phoneToShare}` : ''
    }`;

    const newSosRow = {
      user_id: user.id,
      author_name: `${riderName} (${vehicle})`,
      vehicle,
      type: 'sos',
      category: 'sos',
      badge:
        selectedSosOption.urgency === 'grave'
          ? '🚨 URGENCIA GRAVE • ACCIDENTE/SEGURIDAD'
          : `🚨 AUXILIO MECÁNICO • ${timeStr} hs`,
      title: sosTitle,
      description: sosDescription,
      zone: resolvedAddress || selectedZone,
      lat: finalLat,
      lng: finalLng,
      confirm_count: 1,
      verified: true,
      extra: JSON.stringify(extraObj),
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('alerts').insert(newSosRow);
        if (error) throw error;
        await fetchAlerts();
      } else {
        setDbItems((prev) => [
          {
            id: `local-sos-${Date.now()}`,
            user_id: user.id,
            layer: 'sos',
            subType: 'sos',
            type: 'sos',
            mapPinType: 'sos',
            badge: newSosRow.badge,
            time: `${timeStr} hs`,
            title: sosTitle,
            desc: sosDescription,
            confirmCount: 1,
            verified: true,
            category: 'sos',
            zone: newSosRow.zone,
            lat: finalLat,
            lng: finalLng,
            ...extraObj,
          },
          ...prev,
        ]);
      }

      setLastSentSos({
        title: sosTitle,
        label: selectedSosOption.label,
        note: sosNote.trim(),
        phone: phoneToShare,
        time: `${timeStr} hs`,
        zone: resolvedAddress || `${selectedZone} (${selectedSubzone})`,
        isRealGps,
        lat: finalLat,
        lng: finalLng,
      });
      setActiveLayer('sos');
      setSelectedSubzoneCoords([finalLat, finalLng]);
      setSheetHeightPx(getHalfSheetHeight());
    } catch (err) {
      alert(`No se pudo emitir la alerta SOS: ${err.message}`);
    } finally {
      setSendingSos(false);
    }
  };

  // Compañero toca "🤝 Voy en camino" en un SOS activo
  const handleOfferSosHelp = async (sosItem) => {
    if (!canUseCadeteTools || !user) return;
    const helperName = profile?.full_name || user.email?.split('@')[0] || 'Compañero';
    const currentHelpers = Array.isArray(sosItem.helpers) ? sosItem.helpers : [];
    if (currentHelpers.includes(helperName)) return;

    const nextHelpers = [...currentHelpers, helperName];
    saveLocalOverride(sosItem.id, { helpers: nextHelpers });

    if (sosItem.isFromDb && isSupabaseConfigured) {
      const updatedExtra = {
        subType: 'sos',
        urgency: sosItem.urgency,
        phone: sosItem.phone,
        eventTime: sosItem.time,
        helpers: nextHelpers,
        expiresAt: sosItem.expiresAt,
      };
      await supabase
        .from('alerts')
        .update({
          confirm_count: (sosItem.confirmCount || 1) + 1,
          extra: JSON.stringify(updatedExtra),
        })
        .eq('id', sosItem.id);
    }
  };

  const handleCloseSosResolved = async (sosItem) => {
    if (!user) return;
    if (sosItem.user_id !== user.id && !isAdmin) return;
    if (sosItem.isFromDb && isSupabaseConfigured) {
      await supabase.from('alerts').delete().eq('id', sosItem.id);
      setDbItems((prev) => prev.filter((d) => d.id !== sosItem.id));
    } else {
      saveLocalOverride(sosItem.id, { deleted: true });
    }
  };

  const buildWhatsappSosUrl = (sos) => {
    const mapsLink = `https://maps.google.com/?q=${sos.lat},${sos.lng}`;
    const msg =
      `🚨 *SOS CADETE JUJUY* (${sos.time})\n` +
      `👤 *${sos.title}*\n` +
      `⚠️ *Motivo:* ${sos.label}${sos.note ? ` — ${sos.note}` : ''}\n` +
      `📍 *Zona:* ${sos.zone}\n` +
      (sos.phone ? `📱 *WhatsApp:* ${sos.phone}\n` : '') +
      `🗺️ *Ubicación exacta:* ${mapsLink}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const handleFocusOnMap = (item) => {
    if (typeof item.lat === 'number' && typeof item.lng === 'number') {
      setSelectedSubzoneCoords([item.lat, item.lng]);
      setSheetHeightPx(SHEET_COLLAPSED_PX);
    }
  };

  const isSheetCollapsed = sheetHeightPx <= SHEET_COLLAPSED_PX + 24;

  // Botones de capa separados según rol
  const layerButtons = [
    { id: 'controles', label: 'Controles', icon: 'local_police', count: controlesItems.length },
    { id: 'calles', label: 'Calles', icon: 'warning', count: callesItems.length },
    { id: 'gomerias', label: 'Gomerías', icon: 'tire_repair', count: gomeriasItems.length },
    ...(canUseCadeteTools
      ? [
          { id: 'clientes', label: 'Clientes', icon: 'fact_check', count: clientesItems.length },
          { id: 'sos', label: 'SOS', icon: 'emergency', count: sosItems.length },
        ]
      : []),
  ];

  const layerDescriptions = {
    controles: 'Controles móviles expiran solos a las 2h 30m (o con 2 votos "Ya se fue")',
    calles: 'Badenes por lluvia duran 5h • Calles rotas/obras duran 10 días',
    gomerias: 'Agenda estable de gomerías y talleres registrados en Google Maps',
    clientes: 'Historial colaborativo y estadístico de direcciones • Solo Admin puede borrar',
    sos: 'Emergencias y auxilios mecánicos en vivo de deliverys verificados',
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100dvh-8rem)] overflow-hidden bg-surface select-none"
    >
      {/* 1. MAPA INTERACTIVO AL FONDO (Solo muestra los pines de la capa elegida) */}
      <div className="absolute inset-0 z-10">
        <JujuyMap
          selectedZone={selectedZone}
          selectedSubzoneCoords={selectedSubzoneCoords}
          userGpsCoords={sosCoords}
          alerts={activeLayerItems}
          isPlacingPin={isPlacingPin}
          onPinPlaced={handlePinPlaced}
          onCancelPlacing={() => {
            setIsPlacingPin(false);
            if (isPickingSosOnMap) {
              setIsPickingSosOnMap(false);
              setIsSosModalOpen(true);
            }
          }}
        />
      </div>

      {/* 2. HUD SUPERIOR FLOTANTE: Zonas, Clima SMN y Alerta SOS Viva (si existe para Deliverys) */}
      <div className="absolute top-2.5 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Banner Rojo Automático si hay algún SOS activo (Exclusivo Deliverys Nivel 2+) */}
        {canUseCadeteTools && sosItems.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveLayer('sos');
              setSheetHeightPx(getHalfSheetHeight());
            }}
            className="pointer-events-auto w-full bg-error text-on-error px-3 py-2 rounded-2xl shadow-xl border border-white/25 flex items-center justify-between gap-2 animate-pulse active:scale-98"
          >
            <div className="flex items-center gap-2 min-w-0 text-left">
              <span className="material-symbols-outlined text-xl flex-shrink-0">emergency</span>
              <div className="min-w-0">
                <span className="font-label-sm text-[10px] font-extrabold uppercase block">
                  🚨 {sosItems.length} SOS Activo en Jujuy • Tocá para ayudar
                </span>
                <span className="font-label-md text-label-md font-extrabold truncate block">
                  {sosItems[0].title}
                </span>
              </div>
            </div>
            <span className="px-2 py-1 rounded-full bg-white/20 font-label-sm text-[10px] font-extrabold flex-shrink-0">
              Ver ({sosItems[0].helpers?.length || 0} yendo)
            </span>
          </button>
        )}

        {/* Selector Compacto de 3 Zonas / Sub-barrios */}
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
                <span className="material-symbols-outlined text-xs">layers</span>
                <span className="font-label-sm text-[10px] font-bold uppercase">
                  Capa: {activeLayer}
                </span>
              </div>
            </div>

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

        {/* Cápsula Flotante de Clima en Vivo */}
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
              <span className="font-label-sm text-label-sm text-on-surface font-extrabold">12h</span>
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

      {/* 3. BOTONES FLOTANTES SOBRE EL MAPA: Refresh | Botón SOS (Solo Deliverys N2+) | Agregar Alerta */}
      <div
        style={{ bottom: `${Math.min(sheetHeightPx + 12, 230)}px` }}
        className="absolute left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none transition-[bottom] duration-150"
      >
        <button
          onClick={fetchAlerts}
          className="pointer-events-auto w-11 h-11 rounded-full bg-surface-container-lowest/95 text-on-surface flex items-center justify-center shadow-lg border border-surface-container active:scale-90 transition-transform flex-shrink-0"
          title="Actualizar Radar"
          type="button"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
        </button>

        <div className="flex items-center gap-2 pointer-events-none">
          {/* BOTÓN SOS DIRECTO EN EL MAPA: Exclusivo Deliverys Verificados (Nivel 2+) */}
          {canUseCadeteTools && (
            <button
              id="btn-map-sos"
              onClick={handleOpenSosModal}
              type="button"
              title="Pedir Auxilio SOS"
              className="pointer-events-auto w-12 h-12 rounded-full bg-error text-on-error flex items-center justify-center shadow-[0_6px_18px_rgba(220,38,38,0.5)] border-2 border-white active:scale-95 transition-transform flex-shrink-0"
            >
              <span className="font-label-md text-xs font-black tracking-wider leading-none">
                SOS
              </span>
            </button>
          )}

          {/* Agregar Alerta (Pin Arrastrable) */}
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
                ? 'Ingresar para Reportar'
                : isPlacingPin
                ? 'Cancelar Pin'
                : 'Agregar Alerta'}
            </span>
          </button>
        </div>
      </div>

      {/* 4. BARRA / CAJÓN INFERIOR DESLIZABLE POR CAPAS SEPARADAS */}
      <section
        style={{ height: `${sheetHeightPx}px` }}
        className={`absolute left-0 right-0 bottom-0 z-30 bg-surface-container-lowest rounded-t-3xl shadow-[0_-8px_30px_rgba(21,28,39,0.18)] border-t border-surface-container flex flex-col overflow-hidden ${
          isDraggingSheet ? '' : 'transition-[height] duration-200 ease-out'
        }`}
      >
        {/* Cabecera Arrastrable */}
        <div
          onTouchStart={(e) => {
            if (e.touches?.[0]) handleSheetPointerStart(e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches?.[0]) handleSheetPointerMove(e.touches[0].clientY);
          }}
          onTouchEnd={handleSheetPointerEnd}
          onMouseDown={(e) => handleSheetPointerStart(e.clientY)}
          className="pt-2 pb-1.5 px-4 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 bg-surface-container-lowest"
        >
          <div className="w-11 h-1.5 rounded-full bg-secondary/30 mx-auto mb-1.5" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-lg">layers</span>
              <h2 className="font-label-lg text-label-lg text-on-surface font-extrabold">
                Capas del Mapa
              </h2>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSheetHeightPx(isSheetCollapsed ? getHalfSheetHeight() : SHEET_COLLAPSED_PX);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-[11px] font-bold active:scale-95"
            >
              <span>{isSheetCollapsed ? 'Subir barra ↑' : 'Bajar barra ↓'}</span>
            </button>
          </div>
        </div>

        {/* Selector de Capas Independientes (Muestra pines y lista SOLO de la capa seleccionada) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2.5 flex-shrink-0 border-b border-surface-container/70">
          {layerButtons.map((btn) => {
            const isActive = activeLayer === btn.id;
            const isSosBtn = btn.id === 'sos' && btn.count > 0;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  setActiveLayer(btn.id);
                  if (isSheetCollapsed) setSheetHeightPx(getHalfSheetHeight());
                }}
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shadow-xs flex-shrink-0 flex items-center gap-1.5 transition-all ${
                  isActive
                    ? btn.id === 'gomerias'
                      ? 'bg-tertiary text-on-tertiary font-extrabold'
                      : btn.id === 'clientes'
                      ? 'bg-indigo-600 text-white font-extrabold'
                      : btn.id === 'sos'
                      ? 'bg-error text-on-error font-extrabold'
                      : 'bg-primary text-on-primary font-extrabold'
                    : isSosBtn
                    ? 'bg-error-container text-on-error-container font-extrabold animate-pulse'
                    : 'bg-surface-container-low text-on-surface font-bold hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{btn.icon}</span>
                <span>
                  {btn.label} ({btn.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Descripción breve de la capa activa + Lista de tarjetas */}
        <div className="flex-1 overflow-y-auto px-4 py-2.5 space-y-2.5 bg-surface">
          <div className="px-2.5 py-1.5 rounded-lg bg-surface-container-low text-secondary font-body-sm text-[11px] font-semibold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">info</span>
            <span>{layerDescriptions[activeLayer]}</span>
          </div>

          {activeLayerItems.length === 0 && (
            <div className="p-6 rounded-xl bg-surface-container-lowest border border-surface-container text-center space-y-1">
              <span className="material-symbols-outlined text-3xl text-secondary">
                {activeLayer === 'sos' ? 'verified_user' : 'map'}
              </span>
              <p className="font-label-md text-label-md text-on-surface font-bold">
                {activeLayer === 'sos'
                  ? 'Sin alertas SOS activas en este momento'
                  : 'No hay reportes activos en esta capa'}
              </p>
              <p className="font-body-sm text-body-sm text-secondary">
                {activeLayer === 'sos'
                  ? 'Si un compañero necesita ayuda mecánica o médica aparecerá aquí con su GPS.'
                  : 'Usá "Agregar Alerta" para ubicar un punto en el mapa.'}
              </p>
            </div>
          )}

          {activeLayerItems.map((item) => {
            const isConfirmed = confirmedItems[item.id];
            const isDismissed = dismissedByMe[item.id];
            const isOwnerOrAdmin = user && (item.user_id === user.id || isAdmin);
            const borderColor =
              item.layer === 'gomerias'
                ? 'bg-tertiary'
                : item.layer === 'clientes'
                ? 'bg-indigo-600'
                : item.layer === 'calles'
                ? 'bg-sky-600'
                : item.layer === 'sos'
                ? 'bg-error'
                : 'bg-primary-container';

            return (
              <article
                key={item.id}
                className="relative bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex flex-col space-y-2 overflow-hidden border border-surface-container/60"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${borderColor}`} />

                {/* Cabecera de la tarjeta */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] uppercase font-extrabold flex items-center gap-1 ${
                      item.layer === 'gomerias'
                        ? 'bg-tertiary-container text-on-tertiary-container'
                        : item.layer === 'clientes'
                        ? 'bg-indigo-100 text-indigo-800'
                        : item.layer === 'calles'
                        ? 'bg-sky-100 text-sky-900'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {item.layer === 'clientes' ? item.tag : item.badge}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFocusOnMap(item)}
                      className="text-primary font-label-sm text-label-sm font-bold flex items-center gap-0.5 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">pin_drop</span>
                      Ver pin
                    </button>

                    {/* Vigencia automática visible */}
                    {!item.isPermanent && item.expiresAt && (
                      <span className="font-label-sm text-[10px] text-secondary font-bold bg-surface-container px-1.5 py-0.5 rounded">
                        ⏳ {formatRemainingTime(item.expiresAt)}
                      </span>
                    )}

                    {/* Solo Admin puede borrar registros de Gomerías estables o Historial de Clientes */}
                    {item.isPermanent && isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDismissOrDelete(item)}
                        className="text-error flex items-center"
                        title="Eliminar registro (Solo Admin)"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cuerpo según tipo de capa */}
                <div>
                  <h3 className="font-label-lg text-label-lg text-on-surface font-extrabold">
                    {item.title}
                  </h3>
                  {item.desc && (
                    <p className="font-body-sm text-body-sm text-secondary mt-0.5">{item.desc}</p>
                  )}
                </div>

                {/* VISTA ESPECIAL CAPA 3: GOMERÍAS ESTABLES */}
                {item.layer === 'gomerias' && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-body-sm text-on-surface flex flex-col gap-0.5 bg-surface-container-low p-2 rounded-lg">
                      <span>📍 {item.address}</span>
                      <span className="font-bold text-tertiary">🕒 {item.hours}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {item.phone ? (
                        <a
                          href={`tel:${item.phone}`}
                          className="h-9 rounded-full bg-tertiary text-on-tertiary font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">call</span>
                          Llamar
                        </a>
                      ) : (
                        <span className="h-9 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm flex items-center justify-center">
                          Sin teléfono
                        </span>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${item.title} ${item.address || ''} Jujuy`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm text-primary">
                          navigation
                        </span>
                        Google Maps
                      </a>
                    </div>
                  </div>
                )}

                {/* VISTA ESPECIAL CAPA 4: HISTORIAL DE CLIENTES / DIRECCIONES (SOLO DELIVERYS N2+) */}
                {item.layer === 'clientes' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] bg-indigo-50 text-indigo-900 px-2.5 py-1.5 rounded-lg font-bold">
                      <span>📊 Estadística: {item.reportsCount || 1} reportes de riders</span>
                      <span>{(item.comments || []).length} notas</span>
                    </div>

                    {/* Hilo de comentarios / experiencias de compañeros */}
                    {(item.comments || []).length > 0 && (
                      <div className="space-y-1.5 bg-surface-container-low p-2.5 rounded-xl border border-surface-container">
                        {(item.comments || []).map((c) => (
                          <div key={c.id} className="text-[11px] leading-snug">
                            <span className="font-extrabold text-on-surface">{c.author}</span>{' '}
                            <span className="text-secondary text-[10px]">({c.date}):</span>{' '}
                            <span className="text-on-surface">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Agregar nueva experiencia al historial de esta dirección */}
                    {commentingItemId === item.id ? (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Ej: Atiende en portón gris, responde al 388..."
                          className="flex-1 h-9 px-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none border border-indigo-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddClientComment(item)}
                          className="px-3 h-9 rounded-lg bg-indigo-600 text-white font-label-sm text-label-sm font-bold active:scale-95"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCommentingItemId(item.id);
                          setNewCommentText('');
                        }}
                        className="w-full h-9 rounded-full bg-indigo-50 text-indigo-700 font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 hover:bg-indigo-100 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">add_comment</span>
                        + Sumar experiencia a esta dirección
                      </button>
                    )}
                  </div>
                )}

                {/* VISTA ESPECIAL CAPA 5: SOS AUXILIO EN VIVO (SOLO DELIVERYS N2+) */}
                {item.layer === 'sos' && (
                  <div className="space-y-2 pt-1">
                    {item.helpers?.length > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-tertiary-container/25 text-tertiary font-label-sm text-label-sm font-extrabold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">two_wheeler</span>
                        <span>En camino a ayudar: {item.helpers.join(', ')}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOfferSosHelp(item)}
                        className="h-9 rounded-full bg-error text-on-error font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">handshake</span>
                        Voy en camino ({item.helpers?.length || 0})
                      </button>
                      <a
                        href={`https://maps.google.com/?q=${item.lat},${item.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm text-primary">
                          navigation
                        </span>
                        Ir con Maps
                      </a>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {item.phone && (
                        <a
                          href={`https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hola compañero, vi tu SOS en Comuna Rider Jujuy. ¿Qué necesitás?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 h-8 rounded-full bg-tertiary text-on-tertiary font-label-sm text-label-sm font-bold flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          WhatsApp ({item.phone})
                        </a>
                      )}
                      {isOwnerOrAdmin && (
                        <button
                          type="button"
                          onClick={() => handleCloseSosResolved(item)}
                          className="px-3 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm text-tertiary">
                            check_circle
                          </span>
                          Ya me ayudaron
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* BOTONES COMUNES PARA CAPAS TEMPORALES (CONTROLES Y CALLES) */}
                {(item.layer === 'controles' || item.layer === 'calles') && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleConfirmStillThere(item)}
                        className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 active:scale-95 transition-all ${
                          isConfirmed
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-low text-primary hover:bg-primary/10'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">thumb_up</span>
                        <span>Sigue ahí ({item.confirmCount || 1})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDismissOrDelete(item)}
                        className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 active:scale-95 ${
                          isDismissed
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-surface-container-low text-secondary hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isOwnerOrAdmin ? 'delete' : 'flag'}
                        </span>
                        <span>
                          {isOwnerOrAdmin
                            ? 'Borrar'
                            : `Ya se fue (${item.dismissVotes || 0}/${item.subType === 'obra' ? 3 : 2})`}
                        </span>
                      </button>
                    </div>

                    {item.verified ? (
                      <span className="font-label-sm text-[11px] text-tertiary flex items-center gap-0.5 font-bold">
                        <span className="material-symbols-outlined text-sm">verified</span> Delivery
                      </span>
                    ) : (
                      <span className="font-body-sm text-[11px] text-secondary">Vecino</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* MODAL 1: AGREGAR ALERTA / REGISTRO DESDE PIN ARRASTRABLE (Adaptado según rol) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-space-md shadow-2xl flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Agregar Punto al Mapa
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary"
                type="button"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {pickedCoords && (
              <div className="px-3 py-1.5 rounded-lg bg-surface-container-low font-label-sm text-label-sm text-primary font-bold flex items-center justify-between">
                <span>
                  📍 Pin en: {pickedCoords.lat}, {pickedCoords.lng}
                </span>
                <span>{selectedZone}</span>
              </div>
            )}

            {/* Opciones disponibles según el rol */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => applyPresetByLayer('controles')}
                className={`p-2.5 rounded-xl flex flex-col items-center gap-1 text-center ${
                  reportLayer === 'controles'
                    ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">local_police</span>
                <span className="font-label-sm text-label-sm">Control / Grúa (2h30)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPresetByLayer('calles_lluvia')}
                className={`p-2.5 rounded-xl flex flex-col items-center gap-1 text-center ${
                  reportLayer === 'calles' && reportSubType === 'lluvia'
                    ? 'bg-sky-600 text-white shadow-sm font-bold'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">tsunami</span>
                <span className="font-label-sm text-label-sm">Lluvia / Badén (5h)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPresetByLayer('calles_obra')}
                className={`p-2.5 rounded-xl flex flex-col items-center gap-1 text-center ${
                  reportLayer === 'calles' && reportSubType === 'obra'
                    ? 'bg-sky-700 text-white shadow-sm font-bold'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">construction</span>
                <span className="font-label-sm text-label-sm">Calle Rota / Obra (10d)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPresetByLayer('gomerias')}
                className={`p-2.5 rounded-xl flex flex-col items-center gap-1 text-center ${
                  reportLayer === 'gomerias'
                    ? 'bg-tertiary text-on-tertiary shadow-sm font-bold'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">tire_repair</span>
                <span className="font-label-sm text-label-sm">Gomería / Taller</span>
              </button>

              {canUseCadeteTools && (
                <button
                  type="button"
                  onClick={() => applyPresetByLayer('clientes')}
                  className={`col-span-2 p-2.5 rounded-xl flex items-center justify-center gap-2 ${
                    reportLayer === 'clientes'
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'bg-indigo-50 text-indigo-800 font-bold'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">fact_check</span>
                  <span className="font-label-sm text-label-sm">
                    Registrar Dirección / Cliente (Historial Delivery)
                  </span>
                </button>
              )}
            </div>

            {reportLayer === 'clientes' && (
              <div className="space-y-2">
                <div>
                  <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                    Motivo Estadístico Principal
                  </label>
                  <select
                    value={reportClientTag}
                    onChange={(e) => setReportClientTag(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
                  >
                    {CLIENT_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                {reportClientTag === '✏️ Otro' && (
                  <input
                    type="text"
                    value={customClientTag}
                    onChange={(e) => setCustomClientTag(e.target.value)}
                    placeholder="Escribí el motivo (Ej: Perro suelto, portón trabado, paga tarde...)"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none border border-indigo-300"
                  />
                )}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder={
                  reportLayer === 'gomerias'
                    ? 'Nombre de la Gomería o Taller (Ej: Gomería Norte)'
                    : reportLayer === 'clientes'
                    ? 'Dirección exacta o edificio (Ej: Av. Senador Pérez 420)'
                    : 'Ubicación exacta (Ej: Rotonda Chango Más)'
                }
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
              />
              <textarea
                rows={2}
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder={
                  reportLayer === 'clientes'
                    ? 'Contá tu experiencia: timbre que no anda, teléfono alternativo, dónde esperar...'
                    : reportLayer === 'controles'
                    ? 'Detalle opcional (podés dejarlo vacío, o aclarar: grúa, alcoholemia, piden papeles...)'
                    : 'Detalle útil para quienes pasan por esta calle...'
                }
                className="w-full p-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none resize-none"
              />

              {reportLayer === 'gomerias' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={reportHours}
                    onChange={(e) => setReportHours(e.target.value)}
                    placeholder="Horario (Ej: 24hs)"
                    className="h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
                  />
                  <input
                    type="tel"
                    value={reportPhone}
                    onChange={(e) => setReportPhone(e.target.value)}
                    placeholder="Tel (+549388...)"
                    className="h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
                  />
                </div>
              )}
            </div>

            <button
              id="btn-confirm-report"
              disabled={savingAlert}
              onClick={handlePublishAlert}
              className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
              type="button"
            >
              <span className="material-symbols-outlined">send</span>
              {savingAlert ? 'Guardando en Supabase...' : 'Publicar en esta Capa'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: DESPLIEGUE CÓMODO DE EMERGENCIA SOS (Exclusivo Deliverys Nivel 2+) */}
      {isSosModalOpen && canUseCadeteTools && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-space-md shadow-2xl space-y-3 border-2 border-error">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-error text-on-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl animate-pulse">emergency</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                    Pedir Auxilio SOS
                  </h3>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Alerta a deliverys verificados en tiempo real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSosModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {lastSentSos ? (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-xl bg-error-container text-on-error-container space-y-1">
                  <div className="font-label-lg text-label-lg font-extrabold flex items-center gap-1.5">
                    <span className="material-symbols-outlined">notifications_active</span>
                    <span>¡SOS publicado en el Radar de Cadetes!</span>
                  </div>
                  <p className="font-body-sm text-body-sm">
                    Todos los compañeros conectados en la app ya ven tu ubicación en{' '}
                    <strong>{lastSentSos.zone}</strong> ({lastSentSos.lat}, {lastSentSos.lng}) y tu
                    teléfono.
                  </p>
                </div>

                {/* Puente directo a WhatsApp para que no quede como grito sordo */}
                <a
                  href={buildWhatsappSosUrl(lastSentSos)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-full bg-tertiary text-on-tertiary font-label-lg text-label-lg font-extrabold shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-xl">share</span>
                  📲 Compartir SOS al Grupo de WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => setIsSosModalOpen(false)}
                  className="w-full h-11 rounded-full bg-surface-container text-on-surface font-label-md text-label-md font-bold"
                >
                  Volver al Mapa
                </button>
              </div>
            ) : (
              <>
                {/* Nivel 1: Urgencia Grave */}
                <div className="space-y-1.5">
                  <span className="font-label-sm text-[11px] uppercase text-error font-extrabold">
                    🔴 Urgencia Grave / Seguridad
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {SOS_OPTIONS.filter((o) => o.urgency === 'grave').map((opt) => {
                      const active = selectedSosOption.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedSosOption(opt)}
                          className={`p-2.5 rounded-xl flex items-center gap-2 text-left border transition-all ${
                            active
                              ? 'bg-error text-on-error border-error font-extrabold shadow-sm'
                              : 'bg-error-container/35 text-on-surface border-error/25 font-bold'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                          <span className="font-label-sm text-label-sm leading-tight">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Accesos rápidos a emergencias médicas/policía si eligió accidente o robo */}
                  {selectedSosOption.urgency === 'grave' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href="tel:107"
                        className="h-9 rounded-full bg-error text-on-error font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">call</span>
                        Llamar 107 SAME
                      </a>
                      <a
                        href="tel:911"
                        className="h-9 rounded-full bg-inverse-surface text-inverse-on-surface font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">local_police</span>
                        Llamar 911 Policía
                      </a>
                    </div>
                  )}
                </div>

                {/* Nivel 2: Auxilio Mecánico Leve */}
                <div className="space-y-1.5">
                  <span className="font-label-sm text-[11px] uppercase text-amber-700 font-extrabold">
                    🟡 Auxilio Mecánico en Ruta
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SOS_OPTIONS.filter((o) => o.urgency === 'mecanico').map((opt) => {
                      const active = selectedSosOption.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedSosOption(opt)}
                          className={`p-2 rounded-xl flex items-center gap-1.5 text-left border transition-all ${
                            active
                              ? 'bg-amber-500 text-white border-amber-600 font-extrabold shadow-sm'
                              : 'bg-surface-container-low text-on-surface border-surface-container font-bold'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">{opt.icon}</span>
                          <span className="font-label-sm text-label-sm leading-tight">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ubicación GPS Real, Dirección Detectada, Teléfono y Nota breve */}
                <div className="space-y-2 pt-1">
                  <div
                    className={`p-3 rounded-xl border space-y-1.5 ${
                      gpsStatus === 'ready' || gpsStatus === 'manual'
                        ? 'bg-sky-50 border-sky-300'
                        : gpsStatus === 'error'
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-surface-container-low border-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-extrabold text-on-surface">
                        {gpsStatus === 'locating'
                          ? '📡 Obteniendo ubicación GPS real...'
                          : gpsStatus === 'ready' && sosCoords
                          ? `🔵 GPS Real (±${sosCoords.accuracy || 15}m): ${sosCoords.lat}, ${sosCoords.lng}`
                          : gpsStatus === 'manual' && sosCoords
                          ? `📍 Punto fijado en mapa: ${sosCoords.lat}, ${sosCoords.lng}`
                          : '⚠️ Sin señal GPS automática'}
                      </span>
                      <button
                        type="button"
                        onClick={requestRealGpsLocation}
                        className="text-primary font-extrabold underline flex-shrink-0"
                      >
                        Actualizar GPS
                      </button>
                    </div>

                    {sosAddress && (
                      <p className="font-label-sm text-[11px] font-bold text-sky-900">
                        📍 Calle detectada: {sosAddress}
                      </p>
                    )}

                    {gpsErrorMsg && (
                      <p className="font-body-sm text-[11px] text-amber-900 leading-snug">
                        {gpsErrorMsg}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleStartManualSosPin}
                      className="w-full h-8 rounded-full bg-surface-container-lowest border border-surface-container text-on-surface font-label-sm text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">
                        pin_drop
                      </span>
                      {sosCoords
                        ? 'Ajustar mi punto exacto en el mapa'
                        : 'Marcar mi ubicación exacta en el mapa'}
                    </button>
                  </div>

                  {hasRegisteredPhone(sosPhone) && !isEditingSosPhone ? (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-tertiary-container/15 border border-tertiary/30 text-[12px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-base text-tertiary">
                          verified
                        </span>
                        <span className="font-bold text-on-surface truncate">
                          WhatsApp registrado: <strong className="text-tertiary">{sosPhone}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingSosPhone(true)}
                        className="text-primary font-label-sm text-label-sm font-extrabold underline flex-shrink-0 ml-2"
                      >
                        Editar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-0.5">
                        <label className="font-label-sm text-[10px] uppercase text-secondary font-bold">
                          Tu WhatsApp (+54 9 prellenado • se guarda en tu perfil)
                        </label>
                        {!sosPhone.startsWith('+54 9') && (
                          <button
                            type="button"
                            onClick={() => setSosPhone(formatArPhone(sosPhone))}
                            className="font-label-sm text-[10px] text-primary font-extrabold underline"
                          >
                            Aplicar +54 9
                          </button>
                        )}
                      </div>
                      <input
                        type="tel"
                        value={sosPhone}
                        onChange={(e) => setSosPhone(e.target.value)}
                        onBlur={() => setSosPhone((prev) => formatArPhone(prev))}
                        placeholder="+54 9 388 4123456"
                        className="w-full h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    value={sosNote}
                    onChange={(e) => setSosNote(e.target.value)}
                    placeholder="Referencia rápida (Ej: Esquina YPF, estoy bien / necesito inflador)"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={sendingSos}
                  onClick={handleEmitSos}
                  className="w-full h-12 rounded-full bg-error text-on-error font-label-lg text-label-lg font-black shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">emergency_share</span>
                  {sendingSos ? 'Enviando SOS...' : 'ENVIAR ALERTA SOS AHORA'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
