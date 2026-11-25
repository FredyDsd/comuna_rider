import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Únicas zonas reales de logueo en PedidosYa Jujuy
const PEYA_LOGIN_ZONES = ['Centro', 'Los Perales'];

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function toIsoDateLocal(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildTwoWeeksCalendar() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = toIsoDateLocal(today);

  // Lunes de la semana actual (en JS getDay(): 0=Dom, 1=Lun ... 6=Sáb)
  const dayOfWeek = today.getDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + offsetToMonday);

  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    const id = toIsoDateLocal(d);
    const weekDayIdx = i % 7; // 0 = Lun .. 6 = Dom
    const dateNumber = `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}`;

    days.push({
      id,
      weekIndex: i < 7 ? 0 : 1,
      dayShort: DAY_NAMES_SHORT[weekDayIdx],
      dayFull: DAY_NAMES_FULL[weekDayIdx],
      dateNumber,
      fullLabel: `${DAY_NAMES_FULL[weekDayIdx]} ${dateNumber}`,
      isToday: id === todayIso,
    });
  }

  return { days, todayIso };
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

function hasValidPhone(raw = '') {
  const digits = (raw || '').replace(/\D/g, '');
  const local = digits.startsWith('549')
    ? digits.slice(3)
    : digits.startsWith('54')
    ? digits.slice(2)
    : digits;
  return local.length >= 8;
}

function parseShiftDetail(rawDetail = '') {
  if (!rawDetail || typeof rawDetail !== 'string') {
    return { whatsapp: '', vehicle: 'Moto', note: '' };
  }
  if (rawDetail.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawDetail);
      return {
        whatsapp: parsed.whatsapp || '',
        vehicle: parsed.vehicle || 'Moto',
        note: parsed.note || '',
      };
    } catch {
      return { whatsapp: '', vehicle: 'Moto', note: rawDetail };
    }
  }
  return {
    whatsapp: '',
    vehicle: rawDetail.toLowerCase().includes('bici') ? 'Bici' : 'Moto',
    note: rawDetail.replace(/^•\s*/, '').trim(),
  };
}

function buildInitialSeeds(calendarDays, todayIso) {
  const todayDay = calendarDays.find((d) => d.id === todayIso) || calendarDays[0];
  const todayIdx = calendarDays.findIndex((d) => d.id === todayDay.id);
  const tomorrowDay = calendarDays[Math.min(todayIdx + 1, calendarDays.length - 1)] || todayDay;
  const nextWeekMonday = calendarDays[7] || todayDay;

  return [
    {
      id: 'seed-shift-1',
      user_id: 'seed-user-1',
      day_id: todayDay.id,
      type: 'suelto',
      typeBadge: 'Suelto / Cedo libre',
      timeAgo: 'Hace 8m',
      highDemand: true,
      time: '12:30 – 16:00',
      note: 'Almuerzo pico',
      zone: 'Centro',
      vehicle: 'Moto',
      whatsapp: '+54 9 3884123456',
      cadete: 'Lucas M.',
      score: 'Score 98% • Cadete Verificado',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'seed-shift-2',
      user_id: 'seed-user-2',
      day_id: todayDay.id,
      type: 'permuto',
      typeBadge: 'Permuto / Cambio',
      timeAgo: 'Hace 19m',
      highDemand: false,
      time: '20:00 – 00:00',
      note: 'Busco cambiar por franja de mediodía en Centro',
      zone: 'Los Perales',
      vehicle: 'Moto',
      whatsapp: '+54 9 3884889900',
      cadete: 'Franco G.',
      score: 'Score 96% • Cadete Verificado',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'seed-shift-3',
      user_id: 'seed-user-3',
      day_id: tomorrowDay.id,
      type: 'suelto',
      typeBadge: 'Suelto / Cedo libre',
      timeAgo: 'Hace 35m',
      highDemand: true,
      time: '19:30 – 23:30',
      note: 'No llego por estudio, libero puntual',
      zone: 'Centro',
      vehicle: 'Bici',
      whatsapp: '+54 9 3885112233',
      cadete: 'Esteban K.',
      score: 'Score 95% • Cadete Verificado',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 'seed-shift-4',
      user_id: 'seed-user-4',
      day_id: nextWeekMonday.id,
      type: 'suelto',
      typeBadge: 'Suelto / Cedo libre',
      timeAgo: 'Hace 1h',
      highDemand: false,
      time: '11:30 – 15:00',
      note: 'Semana próxima disponible para cubrir',
      zone: 'Los Perales',
      vehicle: 'Moto',
      whatsapp: '+54 9 3884776655',
      cadete: 'Matías R.',
      score: 'Score 99% • Cadete Verificado',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
  ];
}

export default function TurnosPage() {
  const navigate = useNavigate();
  const { user, profile, canUseCadeteTools, updateProfile } = useAuth();

  const { days: calendarDays, todayIso } = useMemo(() => buildTwoWeeksCalendar(), []);
  const seedShifts = useMemo(
    () => buildInitialSeeds(calendarDays, todayIso),
    [calendarDays, todayIso]
  );

  // Vistas: 'general' (todos los turnos publicados) | 'mine' (mis horarios publicados + publicar)
  const [viewMode, setViewMode] = useState('general');
  const [selectedDay, setSelectedDay] = useState(todayIso);
  const [activeFilter, setActiveFilter] = useState('all');

  // Refs para deslizar la tira de 14 días con mouse o dedo
  const daysStripRef = useRef(null);
  const modalDaysStripRef = useRef(null);
  const stripDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });
  const modalStripDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  // Modal de publicación
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishDay, setPublishDay] = useState(todayIso);
  const [publishType, setPublishType] = useState('ceder');
  const [publishZone, setPublishZone] = useState('Centro');
  const [startTime, setStartTime] = useState('12:30');
  const [endTime, setEndTime] = useState('16:00');
  const [publishComment, setPublishComment] = useState('');
  const [publishWhatsapp, setPublishWhatsapp] = useState('+54 9 388 ');
  const [savingShift, setSavingShift] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [dbShifts, setDbShifts] = useState([]);
  const [deletedSeedIds, setDeletedSeedIds] = useState([]);

  const hasSavedPhoneInProfile = hasValidPhone(profile?.whatsapp);

  useEffect(() => {
    if (hasSavedPhoneInProfile) {
      setPublishWhatsapp(formatArPhone(profile.whatsapp));
    }
  }, [hasSavedPhoneInProfile, profile?.whatsapp]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const dayLookup = useMemo(() => {
    const map = {};
    calendarDays.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [calendarDays]);

  const fetchShifts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return;

      const ownerIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
      let phoneByUserId = {};
      if (ownerIds.length > 0) {
        try {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, whatsapp')
            .in('id', ownerIds);
          if (profilesData) {
            profilesData.forEach((p) => {
              if (p.whatsapp) phoneByUserId[p.id] = p.whatsapp;
            });
          }
        } catch {
          // Si falla la consulta auxiliar de perfiles continúa con los datos del turno
        }
      }

      const mapped = data.map((row) => {
        const parsedDetail = parseShiftDetail(row.detail);
        const normalizedDayId = /^\d{4}-\d{2}-\d{2}$/.test(row.day_id || '')
          ? row.day_id
          : todayIso;
        const normalizedZone = row.zone?.toLowerCase().includes('perales')
          ? 'Los Perales'
          : 'Centro';
        const cleanPeriodNote = (row.period || '')
          .replace(/^\(|\)$/g, '')
          .replace(/^Turno Jujuy$/i, '')
          .trim();

        return {
          id: row.id,
          user_id: row.user_id,
          day_id: normalizedDayId,
          type: row.type || 'suelto',
          typeBadge: row.type_badge || 'Suelto / Cedo libre',
          timeAgo: 'Reciente',
          highDemand: Boolean(row.high_demand),
          time: row.time_range,
          note: parsedDetail.note || cleanPeriodNote,
          zone: normalizedZone,
          vehicle: parsedDetail.vehicle || 'Moto',
          whatsapp: parsedDetail.whatsapp || phoneByUserId[row.user_id] || '',
          cadete: row.cadete_name,
          score: row.cadete_score || 'Score 98% • Cadete Verificado',
          avatar:
            row.avatar_url ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          isFromDb: true,
        };
      });

      setDbShifts(mapped);
    } catch (err) {
      console.warn('Error cargando turnos de Supabase:', err);
    }
  }, [todayIso]);

  useEffect(() => {
    fetchShifts();

    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('public:shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        fetchShifts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchShifts]);

  const allShifts = useMemo(() => {
    const activeSeeds = seedShifts.filter((s) => !deletedSeedIds.includes(s.id));
    return [...dbShifts, ...activeSeeds];
  }, [dbShifts, seedShifts, deletedSeedIds]);

  const myShifts = useMemo(() => {
    if (!user) return [];
    return allShifts
      .filter((s) => s.user_id === user.id)
      .sort((a, b) => (a.day_id || '').localeCompare(b.day_id || ''));
  }, [allShifts, user]);

  const createMouseDragHandlers = (containerRef, dragStateRef) => ({
    onMouseDown: (e) => {
      const el = containerRef.current;
      if (!el) return;
      dragStateRef.current = {
        isDown: true,
        startX: e.pageX - el.offsetLeft,
        scrollLeft: el.scrollLeft,
      };
    },
    onMouseLeave: () => {
      dragStateRef.current.isDown = false;
    },
    onMouseUp: () => {
      dragStateRef.current.isDown = false;
    },
    onMouseMove: (e) => {
      if (!dragStateRef.current.isDown || !containerRef.current) return;
      e.preventDefault();
      const x = e.pageX - containerRef.current.offsetLeft;
      const walk = (x - dragStateRef.current.startX) * 1.4;
      containerRef.current.scrollLeft = dragStateRef.current.scrollLeft - walk;
    },
  });

  const handleOpenPublishModal = () => {
    if (!canUseCadeteTools) {
      if (
        window.confirm(
          '🔒 Acción restringida.\nSolo los Cadetes Verificados pueden publicar turnos. ¿Ir a Mi Perfil?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    setPublishDay(selectedDay);
    setPublishWhatsapp(hasSavedPhoneInProfile ? formatArPhone(profile.whatsapp) : '+54 9 388 ');
    setIsPublishModalOpen(true);
  };

  const handleRequestShiftWhatsApp = (shift) => {
    const dayInfo = dayLookup[shift.day_id];
    const dayLabel = dayInfo ? dayInfo.fullLabel : shift.day_id;
    const cleanPhone = (shift.whatsapp || '').replace(/\D/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      showToast(`${shift.cadete} no tiene WhatsApp cargado en este turno.`);
      return;
    }

    const msg =
      `Hola ${shift.cadete}, vi tu turno publicado en Comuna Rider Jujuy:\n` +
      `📅 Día: ${dayLabel}\n` +
      `🕒 Horario: ${shift.time}\n` +
      `📍 Zona de logueo PeYa: ${shift.zone}\n` +
      `🔄 Modalidad: ${shift.typeBadge}\n` +
      (shift.note ? `💬 Nota: ${shift.note}\n` : '') +
      `¿Todavía lo tenés disponible?`;

    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handlePublishShift = async () => {
    if (!canUseCadeteTools || !user) {
      navigate('/perfil');
      return;
    }

    const rawPhone = hasSavedPhoneInProfile ? profile.whatsapp : publishWhatsapp;
    if (!hasValidPhone(rawPhone)) {
      alert('Ingresá un WhatsApp válido (con característica) para guardarlo en tu perfil.');
      return;
    }

    setSavingShift(true);
    const cadeteName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Jujuy';
    const isSuelto = publishType === 'ceder';
    const formattedPhone = formatArPhone(rawPhone);
    const vehicle = profile?.vehicle || 'Moto';
    const cleanNote = publishComment.trim();

    // Si aún no tenía teléfono en su perfil, se guarda esta única vez en Supabase
    if (!hasSavedPhoneInProfile) {
      updateProfile({ whatsapp: formattedPhone }).catch(() => {});
    }

    const detailPayload = JSON.stringify({
      whatsapp: formattedPhone,
      vehicle,
      note: cleanNote,
    });

    const newRow = {
      user_id: user.id,
      cadete_name: cadeteName,
      cadete_score: `Score ${profile?.score ?? 98}% • Cadete Verificado`,
      day_id: publishDay,
      type: isSuelto ? 'suelto' : 'permuto',
      type_badge: isSuelto ? 'Suelto / Cedo libre' : 'Permuto / Cambio',
      time_range: `${startTime} – ${endTime}`,
      period: cleanNote ? `(${cleanNote})` : `(${publishZone})`,
      zone: publishZone,
      detail: detailPayload,
      high_demand: true,
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('shifts').insert(newRow);
        if (error) throw error;
        await fetchShifts();
      } else {
        const localShift = {
          id: `local-shift-${Date.now()}`,
          user_id: user.id,
          day_id: publishDay,
          type: newRow.type,
          typeBadge: newRow.type_badge,
          timeAgo: 'Ahora mismo',
          highDemand: true,
          time: newRow.time_range,
          note: cleanNote,
          zone: publishZone,
          vehicle,
          whatsapp: formattedPhone,
          cadete: cadeteName,
          score: newRow.cadete_score,
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        };
        setDbShifts((prev) => [localShift, ...prev]);
      }

      setSelectedDay(publishDay);
      setPublishComment('');
      setIsPublishModalOpen(false);
      showToast('¡Turno publicado! Los compañeros podrán pedirlo por WhatsApp.');
    } catch (err) {
      alert(`Error al publicar turno en Supabase: ${err.message}`);
    } finally {
      setSavingShift(false);
    }
  };

  // Control estricto: el usuario SOLO puede borrar sus propios horarios publicados
  const handleDeleteShift = async (shift) => {
    if (!user || shift.user_id !== user.id) return;
    try {
      if (shift.isFromDb && isSupabaseConfigured) {
        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shift.id)
          .eq('user_id', user.id);
        if (error) throw error;
        setDbShifts((prev) => prev.filter((s) => s.id !== shift.id));
      } else if (shift.id.toString().startsWith('seed-')) {
        setDeletedSeedIds((prev) => [...prev, shift.id]);
      } else {
        setDbShifts((prev) => prev.filter((s) => s.id !== shift.id));
      }
      showToast('Tu horario publicado fue eliminado.');
    } catch (err) {
      alert(`No se pudo borrar tu turno: ${err.message}`);
    }
  };

  const filteredGeneralShifts = allShifts.filter((s) => {
    if (s.day_id !== selectedDay) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'Centro') return s.zone === 'Centro';
    if (activeFilter === 'Los Perales') return s.zone === 'Los Perales';
    if (activeFilter === 'suelto') return s.type === 'suelto';
    if (activeFilter === 'permuto') return s.type === 'permuto';
    return true;
  });

  const displayedShifts = viewMode === 'mine' ? myShifts : filteredGeneralShifts;

  return (
    <div className="flex flex-col w-full pb-6 space-y-3.5 pt-2">
      {/* Cabecera Operativa + Selector de Vista (Tablón General vs Mis Horarios) */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-surface-container/40">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/10 text-tertiary font-label-sm text-label-sm uppercase tracking-wider font-extrabold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              PedidosYa Jujuy • 2 Semanas
            </span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold">
              Turnos Centro &amp; Los Perales
            </h1>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="font-label-sm text-[10px] uppercase text-secondary font-bold">
              Publicados
            </span>
            <span className="font-headline-md text-headline-md font-extrabold text-primary-container">
              {allShifts.length}
            </span>
          </div>
        </div>

        {/* Conmutador Vista General vs Vista Particular */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container-low rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('general')}
            className={`h-10 rounded-lg font-label-md text-label-md font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'general'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            <span>Tablón General</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mine')}
            className={`h-10 rounded-lg font-label-md text-label-md font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'mine'
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">person</span>
            <span>Mis Horarios ({myShifts.length})</span>
          </button>
        </div>

        {/* Tira horizontal deslizable continua de los 14 días (2 semanas Lun a Dom) */}
        {viewMode === 'general' && (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between px-0.5 text-[10px] text-secondary font-bold">
              <span>Deslizá horizontalmente ↔ (2 semanas Lun–Dom)</span>
              <span>{dayLookup[selectedDay]?.fullLabel}</span>
            </div>
            <div
              ref={daysStripRef}
              {...createMouseDragHandlers(daysStripRef, stripDragRef)}
              className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 touch-pan-x cursor-grab active:cursor-grabbing select-none"
            >
              {calendarDays.map((day) => {
                const isSelected = selectedDay === day.id;
                const dayCount = allShifts.filter((s) => s.day_id === day.id).length;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDay(day.id)}
                    className={`flex-shrink-0 min-w-[66px] flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-primary-container text-on-primary-container shadow-md'
                        : day.isToday
                        ? 'bg-primary-fixed/50 text-on-surface border border-primary/30'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span
                      className={`font-label-sm text-[10px] uppercase font-bold ${
                        isSelected ? 'opacity-90' : 'text-secondary'
                      }`}
                    >
                      {day.isToday ? 'Hoy' : day.dayShort}
                    </span>
                    <span className="font-label-md text-[12px] font-extrabold leading-tight">
                      {day.dateNumber}
                    </span>
                    <span
                      className={`mt-1 px-1.5 rounded-full font-label-sm text-[9px] font-extrabold ${
                        isSelected
                          ? 'bg-surface-container-lowest text-primary-container'
                          : dayCount > 0
                          ? 'bg-tertiary-container/20 text-tertiary'
                          : 'bg-surface-container text-secondary/70'
                      }`}
                    >
                      {dayCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filtros rápidos (Solo en Tablón General: Centro, Los Perales y Modalidad) */}
      {viewMode === 'general' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'Centro', label: '📍 Centro' },
            { id: 'Los Perales', label: '📍 Los Perales' },
            { id: 'suelto', label: 'Suelto (Cedo)' },
            { id: 'permuto', label: 'Permuto' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveFilter(chip.id)}
              className={`flex-shrink-0 h-9 px-3.5 rounded-full font-label-md text-label-md font-bold shadow-sm transition-transform ${
                activeFilter === chip.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Única opción de Publicar Turno: Exclusivamente dentro de "Mis Horarios" */}
      {viewMode === 'mine' && (
        <div className="relative overflow-hidden bg-primary-fixed/40 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3 border border-primary-container/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <div className="min-w-0">
              <p className="font-label-lg text-label-lg text-on-primary-fixed font-extrabold truncate">
                Publicar nuevo horario
              </p>
              <p className="font-body-sm text-body-sm text-on-primary-fixed-variant truncate">
                {hasSavedPhoneInProfile
                  ? `Usa tu WhatsApp guardado (${formatArPhone(profile.whatsapp)})`
                  : 'Aparecerá en el Tablón General'}
              </p>
            </div>
          </div>
          <button
            id="btn-publicar"
            type="button"
            onClick={handleOpenPublishModal}
            className="h-10 px-4 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md font-extrabold flex items-center gap-1 shadow-md active:scale-95 transition-all flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            Publicar
          </button>
        </div>
      )}

      {/* Listado de Turnos (Tablón General o Mis Horarios Publicados) */}
      <div className="space-y-3">
        {displayedShifts.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col items-center text-center gap-2 border border-surface-container/50">
            <span className="material-symbols-outlined text-3xl text-secondary">event_busy</span>
            <p className="font-headline-md text-headline-md text-on-surface font-extrabold">
              {viewMode === 'mine'
                ? 'Todavía no publicaste ningún horario'
                : 'Sin turnos publicados para este día'}
            </p>
            <p className="font-body-sm text-body-sm text-secondary max-w-xs">
              {viewMode === 'mine'
                ? 'Tocá el botón "Publicar" arriba para ofrecer un turno en Centro o Los Perales. Solo vos podrás borrar tus horarios.'
                : 'Deslizá los días arriba o filtrá por Centro / Los Perales. Si querés liberar un turno, entrá a "Mis Horarios".'}
            </p>
          </div>
        ) : (
          displayedShifts.map((shift) => {
            // SOLO el propietario del turno tiene permiso de borrarlo
            const isMyShift = Boolean(user && shift.user_id === user.id);
            const dayInfo = dayLookup[shift.day_id];
            const dayLabel = dayInfo ? dayInfo.fullLabel : shift.day_id;

            return (
              <div
                key={shift.id}
                className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden border border-surface-container/50"
              >
                <div
                  className={`absolute top-0 left-0 w-1.5 h-full ${
                    shift.type === 'suelto' ? 'bg-tertiary-container' : 'bg-secondary'
                  }`}
                />

                <div className="flex items-start justify-between gap-2 pl-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                        shift.type === 'suelto'
                          ? 'bg-tertiary-container/15 text-tertiary'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {shift.type === 'suelto' ? 'event_available' : 'swap_horiz'}
                      </span>
                      {shift.typeBadge}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-[11px] font-bold">
                      📅 {dayLabel}
                    </span>
                  </div>

                  {/* El botón borrar SOLO aparece en los horarios del propio usuario */}
                  {isMyShift && (
                    <button
                      type="button"
                      onClick={() => handleDeleteShift(shift)}
                      title="Borrar mi turno publicado"
                      className="h-7 px-2.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-extrabold flex items-center gap-1 active:scale-90 transition-transform flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>Borrar</span>
                    </button>
                  )}
                </div>

                <div className="pl-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-on-surface">
                      <span className="material-symbols-outlined text-xl text-primary-container">
                        schedule
                      </span>
                      <span className="font-headline-md text-headline-md font-extrabold tracking-tight">
                        {shift.time}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-extrabold">
                      📍 Logueo: {shift.zone}
                    </span>
                  </div>

                  {shift.note && (
                    <p className="font-body-sm text-body-sm text-secondary">💬 {shift.note}</p>
                  )}
                </div>

                {/* Propietario + Botón directo a WhatsApp con mensaje predeterminado */}
                <div className="pl-1 pt-2 flex items-center justify-between bg-surface-container-low/60 p-2.5 rounded-lg gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      className="w-8 h-8 rounded-full object-cover shadow-sm flex-shrink-0"
                      src={shift.avatar}
                      alt={shift.cadete}
                    />
                    <div className="min-w-0">
                      <p className="font-label-md text-label-md text-on-surface font-extrabold truncate">
                        {shift.cadete} {isMyShift && '(Vos)'}
                      </p>
                      <p className="font-body-sm text-[11px] text-secondary truncate">
                        {shift.vehicle} • {shift.score}
                      </p>
                    </div>
                  </div>

                  {isMyShift ? (
                    <span className="px-3 py-1.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-extrabold flex-shrink-0">
                      Tu publicación
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestShiftWhatsApp(shift)}
                      className="h-10 px-4 rounded-full bg-tertiary text-on-tertiary font-label-md text-label-md font-extrabold shadow-md active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>{shift.type === 'permuto' ? 'Permutar' : 'Pedir por WhatsApp'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Publicar Franja (Tira deslizable de 14 días + Teléfono automático de BD) */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-space-md shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Publicar Turno PedidosYa
              </h3>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Tira horizontal deslizable continua de los 14 días (2 semanas Lun-Dom) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-label-sm text-label-sm uppercase text-secondary font-bold">
                    Elegí el Día (Deslizá ↔)
                  </label>
                  <span className="font-label-sm text-[11px] font-extrabold text-primary">
                    {dayLookup[publishDay]?.fullLabel}
                  </span>
                </div>

                <div
                  ref={modalDaysStripRef}
                  {...createMouseDragHandlers(modalDaysStripRef, modalStripDragRef)}
                  className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 touch-pan-x cursor-grab active:cursor-grabbing select-none"
                >
                  {calendarDays.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setPublishDay(d.id)}
                      className={`flex-shrink-0 min-w-[60px] py-2 px-2 rounded-xl font-label-sm text-[11px] font-bold text-center transition-colors flex flex-col items-center ${
                        publishDay === d.id
                          ? 'bg-primary-container text-on-primary-container font-extrabold shadow-sm'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <span className="text-[9px] uppercase opacity-80">
                        {d.isToday ? 'Hoy' : d.dayShort}
                      </span>
                      <span>{d.dateNumber}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Modalidad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPublishType('ceder')}
                    className={`py-2.5 px-3 rounded-xl font-label-md text-label-md font-bold text-center transition-colors ${
                      publishType === 'ceder'
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-low text-on-surface'
                    }`}
                  >
                    Ceder Libre (Suelto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishType('permutar')}
                    className={`py-2.5 px-3 rounded-xl font-label-md text-label-md font-bold text-center transition-colors ${
                      publishType === 'permutar'
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-low text-on-surface'
                    }`}
                  >
                    Permutar (Cambio)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Zona de Logueo en PedidosYa
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PEYA_LOGIN_ZONES.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setPublishZone(z)}
                      className={`h-11 rounded-xl font-label-md text-label-md font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                        publishZone === z
                          ? 'bg-primary-container text-on-primary-container shadow-sm'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {z}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Inicio Franja
                  </label>
                  <input
                    className="w-full h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Fin Franja
                  </label>
                  <input
                    className="w-full h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Teléfono automático desde la BD (solo pide una vez si la cuenta aún no tiene uno) */}
              {hasSavedPhoneInProfile ? (
                <div className="px-3 py-2 rounded-xl bg-tertiary-container/15 border border-tertiary/30 flex items-center gap-2 text-[12px]">
                  <span className="material-symbols-outlined text-base text-tertiary">
                    verified
                  </span>
                  <span className="font-bold text-on-surface">
                    Se usará tu WhatsApp registrado:{' '}
                    <strong className="text-tertiary">{formatArPhone(profile.whatsapp)}</strong>
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Tu WhatsApp (se guardará en tu perfil para futuros turnos)
                  </label>
                  <input
                    type="tel"
                    value={publishWhatsapp}
                    onChange={(e) => setPublishWhatsapp(e.target.value)}
                    onBlur={() => setPublishWhatsapp((prev) => formatArPhone(prev))}
                    placeholder="+54 9 388 4123456"
                    className="w-full h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none border border-primary/30"
                  />
                </div>
              )}

              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Nota o Cambio Buscado (Opcional)
                </label>
                <input
                  value={publishComment}
                  onChange={(e) => setPublishComment(e.target.value)}
                  className="w-full h-11 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none"
                  placeholder="Ej: Cambio por horario de noche / Libero puntual"
                  type="text"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                id="btn-confirmar-publicacion"
                disabled={savingShift}
                type="button"
                onClick={handlePublishShift}
                className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-extrabold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xl">send</span>
                {savingShift ? 'Guardando en Supabase...' : 'Publicar Turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-full shadow-xl font-body-sm text-body-sm flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-tertiary-fixed text-base">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
