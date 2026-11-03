import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const INITIAL_SHIFTS = [
  {
    id: 'seed-shift-1',
    type: 'suelto',
    typeBadge: 'Suelto / Cedo libre',
    timeAgo: 'Hace 4m',
    highDemand: true,
    time: '12:30 – 16:00',
    period: '(Almuerzo pico)',
    zone: 'Centro & Ciudad Nieva',
    detail: '• Subida Av. Bolivia',
    cadete: 'Lucas M.',
    score: 'Score 98% • Nivel Diamante',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'seed-shift-2',
    type: 'permuto',
    typeBadge: 'Permuto por Turno Mediodía',
    timeAgo: 'Hace 12m',
    highDemand: false,
    time: '20:00 – 00:30',
    period: '(Cena Finde)',
    zone: 'Alto Comedero / Ruta 9',
    detail: '• B° Sargento Cabral',
    cadete: 'Franco G.',
    score: 'Busca Centro o Cuyaya',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'seed-shift-3',
    type: 'urgente',
    typeBadge: 'Urgente • Motivo Mecánico',
    timeAgo: 'Hace 25m',
    highDemand: false,
    time: '08:00 – 12:00',
    period: '(Desayuno)',
    zone: 'Cuyaya / Terminal Vieja',
    detail: '• Av. 19 de Abril',
    cadete: 'Esteban K.',
    score: 'Score 95% • Repuestos',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  },
];

export default function TurnosPage() {
  const navigate = useNavigate();
  const { user, profile, canWriteMapAndShifts, isAdmin } = useAuth();

  const [selectedDay, setSelectedDay] = useState('vie24');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishType, setPublishType] = useState('ceder');
  const [publishZone, setPublishZone] = useState('Centro / San Pedrito');
  const [startTime, setStartTime] = useState('12:30');
  const [endTime, setEndTime] = useState('16:00');
  const [publishComment, setPublishComment] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  const [takenShifts, setTakenShifts] = useState({});
  const [shifts, setShifts] = useState(INITIAL_SHIFTS);

  const days = [
    { id: 'vie24', label: 'Hoy', date: 'Vie 24', slots: '6 cupos' },
    { id: 'sab25', label: 'Mañana', date: 'Sáb 25', slots: '4 cupos' },
    { id: 'dom26', label: 'Domingo', date: 'Dom 26', slots: '2 cupos' },
    { id: 'lun27', label: 'Lunes', date: 'Lun 27', slots: '0 cupos' },
  ];

  const fetchShifts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          type: row.type || 'suelto',
          typeBadge: row.type_badge || 'Suelto / Cedo libre',
          timeAgo: 'Reciente',
          highDemand: Boolean(row.high_demand),
          time: row.time_range,
          period: row.period || '(Turno Jujuy)',
          zone: row.zone,
          detail: row.detail || '• San Salvador de Jujuy',
          cadete: row.cadete_name,
          score: row.cadete_score || 'Score 98% • Cadete Verificado',
          avatar:
            row.avatar_url ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          takenBy: row.taken_by,
          isFromDb: true,
        }));
        setShifts([...mapped, ...INITIAL_SHIFTS]);
      }
    } catch (err) {
      console.warn('Error cargando turnos de Supabase:', err);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleOpenPublishModal = () => {
    if (!canWriteMapAndShifts) {
      if (
        window.confirm(
          '🔒 Acción restringida (Nivel 1: Visitante).\nSolo los Cadetes Verificados pueden publicar turnos. ¿Ir a Mi Perfil para iniciar sesión?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    setIsPublishModalOpen(true);
  };

  const handleTakeShift = async (shift) => {
    if (!canWriteMapAndShifts || !user) {
      if (
        window.confirm(
          '🔒 Iniciá sesión como Cadete Verificado para tomar turnos del tablón. ¿Ir a Mi Perfil?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }

    setTakenShifts((prev) => ({ ...prev, [shift.id]: true }));

    if (shift.isFromDb && isSupabaseConfigured) {
      await supabase.from('shifts').update({ taken_by: user.id }).eq('id', shift.id);
    }
  };

  const handlePublishShift = async () => {
    if (!canWriteMapAndShifts || !user) {
      navigate('/perfil');
      return;
    }

    setSavingShift(true);
    const cadeteName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Jujuy';
    const isSuelto = publishType === 'ceder';

    const newRow = {
      user_id: user.id,
      cadete_name: cadeteName,
      cadete_score: `Score ${profile?.score ?? 98}% • Cadete Verificado`,
      day_id: selectedDay,
      type: isSuelto ? 'suelto' : 'permuto',
      type_badge: isSuelto ? 'Suelto / Cedo libre' : 'Permuto / Cambio',
      time_range: `${startTime} – ${endTime}`,
      period: publishComment.trim() ? `(${publishComment.trim()})` : '(Turno Jujuy)',
      zone: publishZone,
      detail: `• Vehículo: ${profile?.vehicle || 'Moto'}`,
      high_demand: true,
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('shifts').insert(newRow).select().single();
        if (error) throw error;

        if (data) {
          const uiShift = {
            id: data.id,
            user_id: data.user_id,
            type: data.type,
            typeBadge: data.type_badge,
            timeAgo: 'Ahora mismo',
            highDemand: data.high_demand,
            time: data.time_range,
            period: data.period,
            zone: data.zone,
            detail: data.detail,
            cadete: data.cadete_name,
            score: data.cadete_score,
            avatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            isFromDb: true,
          };
          setShifts((prev) => [uiShift, ...prev]);
        }
      } else {
        const localShift = {
          id: `local-shift-${Date.now()}`,
          user_id: user.id,
          type: newRow.type,
          typeBadge: newRow.type_badge,
          timeAgo: 'Ahora mismo',
          highDemand: true,
          time: newRow.time_range,
          period: newRow.period,
          zone: newRow.zone,
          detail: newRow.detail,
          cadete: newRow.cadete_name,
          score: newRow.cadete_score,
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        };
        setShifts((prev) => [localShift, ...prev]);
      }

      setPublishComment('');
      setIsPublishModalOpen(false);
    } catch (err) {
      alert(`Error al publicar turno en Supabase: ${err.message}`);
    } finally {
      setSavingShift(false);
    }
  };

  const handleDeleteShift = async (shift) => {
    if (!user && !shift.id.toString().startsWith('seed-')) return;
    try {
      if (shift.isFromDb && isSupabaseConfigured) {
        const { error } = await supabase.from('shifts').delete().eq('id', shift.id);
        if (error) throw error;
      }
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
    } catch (err) {
      alert(`No se pudo borrar el turno: ${err.message}`);
    }
  };

  const filteredShifts = shifts.filter((s) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'suelto') return s.type === 'suelto';
    if (activeFilter === 'permuto') return s.type === 'permuto';
    if (activeFilter === 'centro') return s.zone.toLowerCase().includes('centro');
    if (activeFilter === 'altocomedero') return s.zone.toLowerCase().includes('alto comedero');
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-6 space-y-4 pt-2">
      {/* Operational Zone Header & Stats Summary */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-surface-container/40">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/10 text-tertiary font-label-sm text-label-sm uppercase tracking-wider font-extrabold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              Bolsa Comunitaria Activa
            </span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold">
              Tablón de Franjas y Turnos
            </h1>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-bold">Total Jujuy</span>
            <span className="font-headline-md text-headline-md font-extrabold text-primary-container">
              {shifts.length} libres
            </span>
          </div>
        </div>

        {/* Day Selector Strip (Carousel) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1 -mx-1 px-1">
          {days.map((day) => {
            const isSelected = selectedDay === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[76px] py-2 px-3 rounded-xl transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container shadow-md'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                }`}
              >
                <span
                  className={`font-label-sm text-label-sm uppercase tracking-wide ${
                    isSelected ? 'opacity-90' : 'text-secondary'
                  }`}
                >
                  {day.label}
                </span>
                <span className="font-headline-md text-headline-md font-extrabold leading-tight">
                  {day.date}
                </span>
                <span
                  className={`inline-block mt-0.5 px-1.5 py-0.2 rounded-full font-label-sm text-[9px] font-extrabold ${
                    isSelected
                      ? 'bg-surface-container-lowest text-primary-container'
                      : 'bg-surface-container text-secondary'
                  }`}
                >
                  {day.slots}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Chips Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`flex-shrink-0 h-9 px-4 rounded-full font-label-md text-label-md font-bold shadow-sm transition-transform flex items-center gap-1.5 ${
            activeFilter === 'all'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">tune</span>
          Todos
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('suelto')}
          className={`flex-shrink-0 h-9 px-4 rounded-full font-label-md text-label-md font-bold shadow-sm transition-transform flex items-center gap-1.5 ${
            activeFilter === 'suelto'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
          Suelto (Gratis)
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('permuto')}
          className={`flex-shrink-0 h-9 px-4 rounded-full font-label-md text-label-md font-bold shadow-sm transition-transform flex items-center gap-1.5 ${
            activeFilter === 'permuto'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          Permuto
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('centro')}
          className={`flex-shrink-0 h-9 px-4 rounded-full font-label-md text-label-md font-bold shadow-sm transition-transform ${
            activeFilter === 'centro'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
          }`}
        >
          Noche Centro
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('altocomedero')}
          className={`flex-shrink-0 h-9 px-4 rounded-full font-label-md text-label-md font-bold shadow-sm transition-transform ${
            activeFilter === 'altocomedero'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
          }`}
        >
          Alto Comedero
        </button>
      </div>

      {/* Hero Quick-Publish Banner (PeYa Soft Crimson Tint) */}
      <div className="relative overflow-hidden bg-primary-fixed/40 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 border border-primary-container/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-xl">event_available</span>
          </div>
          <div className="min-w-0">
            <p className="font-label-lg text-label-lg text-on-primary-fixed font-extrabold truncate">
              ¿No podés rodar hoy?
            </p>
            <p className="font-body-sm text-body-sm text-on-primary-fixed-variant truncate">
              {canWriteMapAndShifts
                ? 'Cedé tu franja al grupo y cuidá tu Score'
                : 'Iniciá sesión (Nivel 2) para publicar turnos'}
            </p>
          </div>
        </div>
        <button
          id="btn-publicar"
          type="button"
          onClick={handleOpenPublishModal}
          className="h-10 px-4 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md font-extrabold flex items-center gap-1 shadow-md active:scale-95 transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined text-base">
            {canWriteMapAndShifts ? 'add_circle' : 'lock'}
          </span>
          Publicar
        </button>
      </div>

      {/* Cards Feed (Shift Board) */}
      <div className="space-y-3.5">
        {filteredShifts.map((shift) => {
          const isTaken = takenShifts[shift.id] || Boolean(shift.takenBy);
          const canDelete = Boolean(
            (user && shift.user_id === user.id) || isAdmin
          );

          return (
            <div
              key={shift.id}
              className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden border border-surface-container/50"
            >
              <div
                className={`absolute top-0 left-0 w-1.5 h-full ${
                  shift.type === 'suelto'
                    ? 'bg-tertiary-container'
                    : shift.type === 'permuto'
                    ? 'bg-secondary'
                    : 'bg-error'
                }`}
              ></div>

              <div className="flex items-start justify-between gap-2 pl-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                      shift.type === 'suelto'
                        ? 'bg-tertiary-container/15 text-tertiary'
                        : shift.type === 'permuto'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {shift.type === 'suelto' ? 'verified' : 'swap_horiz'}
                    </span>
                    {shift.typeBadge}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary font-bold">
                    {shift.timeAgo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {shift.highDemand && (
                    <div className="flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-xs text-primary-container">
                        local_fire_department
                      </span>
                      <span className="font-label-sm text-label-sm font-bold text-on-surface">
                        Demanda Alta
                      </span>
                    </div>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteShift(shift)}
                      title="Borrar turno publicado"
                      className="w-7 h-7 rounded-full bg-error-container text-on-error-container flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pl-1">
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-xl text-primary-container">schedule</span>
                  <span className="font-headline-md text-headline-md font-extrabold tracking-tight">
                    {shift.time}
                  </span>
                  <span className="text-secondary font-label-md text-label-md font-medium">
                    {shift.period}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-secondary mt-1">
                  <span className="material-symbols-outlined text-sm text-secondary">navigation</span>
                  <span className="font-body-md text-body-md font-medium text-on-surface">{shift.zone}</span>
                  <span className="text-xs text-secondary">{shift.detail}</span>
                </div>
              </div>

              {/* Cadete Info Row */}
              <div className="pl-1 pt-2 flex items-center justify-between bg-surface-container-low/60 p-2.5 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    className="w-8 h-8 rounded-full object-cover shadow-sm"
                    src={shift.avatar}
                    alt={shift.cadete}
                  />
                  <div className="min-w-0">
                    <p className="font-label-md text-label-md text-on-surface font-extrabold truncate">
                      {shift.cadete}
                    </p>
                    <p className="font-body-sm text-body-sm text-tertiary flex items-center gap-0.5 font-bold truncate">
                      <span className="material-symbols-outlined text-xs">star</span>
                      {shift.score}
                    </p>
                  </div>
                </div>

                {shift.type === 'permuto' ? (
                  <button
                    type="button"
                    onClick={() => handleTakeShift(shift)}
                    className="h-11 px-4 rounded-full bg-tertiary-container text-on-tertiary font-label-md text-label-md font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                    {isTaken ? 'Solicitado' : 'WhatsApp'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTakeShift(shift)}
                    className={`h-11 px-5 rounded-full font-label-lg text-label-lg font-bold shadow-md active:scale-95 transition-all flex items-center gap-1 flex-shrink-0 ${
                      isTaken
                        ? 'bg-tertiary-container text-on-tertiary'
                        : 'bg-primary-container text-on-primary-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isTaken ? 'done_all' : 'touch_app'}
                    </span>
                    {isTaken ? '¡Asignado!' : 'Agarrar Turno'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Publicar Franja */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-space-md shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Publicar Franja / Turno
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
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Tipo de Publicación
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
                  Zona Operativa
                </label>
                <select
                  value={publishZone}
                  onChange={(e) => setPublishZone(e.target.value)}
                  className="w-full h-12 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none"
                >
                  <option>Centro / San Pedrito</option>
                  <option>Ciudad de Nieva / Los Perales</option>
                  <option>Alto Comedero (Ruta 9)</option>
                  <option>Cuyaya / Moreno / Terminal</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Inicio Franja
                  </label>
                  <input
                    className="w-full h-12 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none"
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
                    className="w-full h-12 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Comentario o Motivo (Opcional)
                </label>
                <input
                  value={publishComment}
                  onChange={(e) => setPublishComment(e.target.value)}
                  className="w-full h-12 bg-surface-container-low rounded-xl px-3 font-body-md text-body-md text-on-surface outline-none"
                  placeholder="Ej: No llego por laburo / Cambio por noche"
                  type="text"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                id="btn-confirmar-publicacion"
                disabled={savingShift}
                type="button"
                onClick={handlePublishShift}
                className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xl">send</span>
                {savingShift ? 'Guardando en Supabase...' : 'Publicar en el Tablón'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
