import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useAuth,
  DEFAULT_AVATAR_URL,
  hasCustomProfilePhoto,
  compressAvatarFile,
  isProfileSuperAdmin,
} from '../context/AuthContext';
import {
  supabase,
  isSupabaseConfigured,
  saveRuntimeSupabaseConfig,
  clearRuntimeSupabaseConfig,
} from '../lib/supabase';

const ZONES = [
  'Centro y Barrios',
  'Alto Comedero',
  'Palpalá',
  'Nueva Terminal',
  'Cuyaya',
  'Chijra',
  'Los Perales',
];

export default function PerfilPage({ mode = 'perfil' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const photoCardRef = useRef(null);
  const isModeratorView = mode === 'moderador' || location.pathname.startsWith('/moderador');

  const {
    user,
    profile,
    role,
    roleInfo,
    loading,
    isBanned,
    hasCustomPhoto,
    canUseCadeteTools,
    isAdmin,
    isSuperAdmin,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    updateProfile,
    requestCadeteVerification,
    refreshProfile,
    signOut,
  } = useAuth();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [highlightPhotoCard, setHighlightPhotoCard] = useState(false);
  const [expandedPhotoUser, setExpandedPhotoUser] = useState(null);

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicle, setVehicle] = useState('Moto');
  const [zone, setZone] = useState('Centro y Barrios');
  const [whatsapp, setWhatsapp] = useState('+54 9 388 ');
  const [status, setStatus] = useState('online');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Estado del Panel de Moderación (Nivel 4)
  const [modTab, setModTab] = useState('pending'); // 'pending' | 'users' | 'alerts'
  const [modProfiles, setModProfiles] = useState([]);
  const [modAlerts, setModAlerts] = useState([]);
  const [modLoading, setModLoading] = useState(false);
  const [modSearch, setModSearch] = useState('');

  // Configuración rápida de credenciales Supabase si .env aún tiene placeholders
  const [sbUrl, setSbUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [sbKey, setSbKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [showConfigForm, setShowConfigForm] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setVehicle(profile.vehicle || 'Moto');
      setZone(profile.zone || 'Centro y Barrios');
      setWhatsapp(profile.whatsapp || '+54 9 388 ');
      setStatus(profile.status || 'online');
    }
  }, [profile]);

  useEffect(() => {
    if (location.state?.highlightPhotoUpload) {
      setHighlightPhotoCard(true);
      const scrollTimer = setTimeout(() => {
        photoCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
      const clearTimer = setTimeout(() => setHighlightPhotoCard(false), 7000);
      navigate(location.pathname, { replace: true, state: {} });
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [location.state, location.pathname, navigate]);

  // Cargar datos del Panel de Control si es vista Moderador (Admin / Super Admin)
  const fetchModerationData = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin || !isModeratorView) return;
    setModLoading(true);
    try {
      const [{ data: profilesData }, { data: alertsData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('verification_requested_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      if (profilesData) setModProfiles(profilesData);
      if (alertsData) {
        setModAlerts(
          alertsData.filter(
            (row) =>
              row.badge !== '🚩 Reporte Feria' &&
              row.badge !== '📢 Aviso Admin' &&
              !String(row.extra || '').includes('"feria_report"') &&
              !String(row.extra || '').includes('"admin_announcement"')
          )
        );
      }
    } catch (err) {
      console.warn('Error cargando datos de moderación:', err);
    } finally {
      setModLoading(false);
    }
  }, [isAdmin, isModeratorView]);

  useEffect(() => {
    if (isAdmin && isModeratorView) {
      fetchModerationData();
    }
  }, [isAdmin, isModeratorView, fetchModerationData]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      if (authMode === 'register') {
        const cleanDigits = whatsapp.replace(/\D/g, '');
        const validWa = cleanDigits.length >= 8 ? whatsapp.trim() : '';
        const res = await signUpWithEmail({
          email,
          password,
          fullName: fullName.trim() || 'Vecino Jujuy',
          whatsapp: validWa,
          vehicle,
          zone,
        });
        if (res?.user && !res?.session) {
          setFeedback(
            'Registro exitoso. Revisá tu correo para confirmar la cuenta o iniciá sesión.'
          );
        } else {
          setFeedback('¡Cuenta creada! Completá tus datos abajo.');
        }
      } else {
        await signInWithEmail({ email, password });
        setFeedback('Sesión iniciada correctamente.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al autenticar con Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo iniciar sesión con Google.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      await updateProfile({
        full_name: fullName.trim() || 'Usuario Jujuy',
        vehicle,
        zone,
        whatsapp: whatsapp.trim(),
        status,
      });
      setFeedback('Datos de perfil actualizados en Supabase.');
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el perfil en Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar solicitud de verificación de Nivel 1 -> Nivel 2 con WhatsApp
  const handleRequestVerification = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    const cleanDigits = whatsapp.replace(/\D/g, '');
    if (cleanDigits.length < 8) {
      setErrorMsg('Por favor ingresá un número de WhatsApp válido (ej: +54 9 388 4123456).');
      return;
    }

    setSubmitting(true);
    try {
      await requestCadeteVerification({
        whatsapp: whatsapp.trim(),
        vehicle,
        zone,
      });
      setFeedback(
        '✅ Solicitud enviada. Los administradores de los grupos de WhatsApp verificarán tu número y activarán tu Nivel 2 (Cadete Verificado).'
      );
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo enviar la solicitud de verificación.');
    } finally {
      setSubmitting(false);
    }
  };

  // Acciones del Moderador (Admin Común vs Super Admin)
  const handleModerateUser = async (targetUserId, updates, successText, targetUserObj = null) => {
    setErrorMsg(null);
    setFeedback(null);

    const targetUser = targetUserObj || modProfiles.find((p) => p.id === targetUserId);
    if (targetUser && isProfileSuperAdmin(targetUser)) {
      setErrorMsg('No se puede modificar ni suspender al Super Admin.');
      return;
    }
    if (!isSuperAdmin && (targetUser?.role === 'admin' || updates.role === 'admin')) {
      setErrorMsg('Solo el Super Admin puede nombrar o degradar Administradores.');
      return;
    }

    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.role === 'admin' || (normalizedUpdates.role && targetUser?.role === 'admin')) {
      normalizedUpdates.score = 98;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...normalizedUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (error) throw error;

      setModProfiles((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, ...normalizedUpdates } : p))
      );
      setExpandedPhotoUser((prev) => (prev?.id === targetUserId ? null : prev));
      if (targetUserId === user?.id) {
        await refreshProfile();
      }
      setFeedback(successText);
    } catch (err) {
      setErrorMsg(`Error al moderar usuario: ${err.message}`);
    }
  };

  const handleRejectUserPhoto = (targetUser) => {
    const preservedRole =
      targetUser.role === 'cadete_emprendedor'
        ? 'cadete_verificado'
        : targetUser.role || 'ciudadano';
    return handleModerateUser(
      targetUser.id,
      {
        role: preservedRole,
        avatar_url: DEFAULT_AVATAR_URL,
        verification_status: 'rejected',
      },
      `❌ Foto de ${targetUser.full_name || targetUser.email} rechazada. Se restauró la foto por defecto para que suba una nueva.`
    );
  };

  const handleModerateDeleteAlert = async (alertId) => {
    try {
      const { error } = await supabase.from('alerts').delete().eq('id', alertId);
      if (error) throw error;
      setModAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setFeedback('🗑️ Alerta eliminada del mapa por moderación.');
    } catch (err) {
      setErrorMsg(`No se pudo borrar la alerta: ${err.message}`);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setFeedback(null);
    setUploadingAvatar(true);
    try {
      const compressedDataUrl = await compressAvatarFile(file);
      await updateProfile({
        avatar_url: compressedDataUrl,
        verification_status: isAdmin ? 'approved' : 'pending',
        verification_requested_at: new Date().toISOString(),
      });
      setHighlightPhotoCard(false);
      setFeedback(
        isAdmin
          ? '📸 Foto de perfil guardada.'
          : '📸 Foto de perfil cargada y enviada a revisión del Administrador.'
      );
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo cargar tu foto de perfil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pendingRequests = modProfiles.filter(
    (p) =>
      p.verification_status === 'pending' ||
      (hasCustomProfilePhoto(p) &&
        p.role !== 'cadete_emprendedor' &&
        p.role !== 'admin' &&
        p.verification_status !== 'rejected')
  );
  const filteredModProfiles = modProfiles.filter((p) => {
    if (!modSearch.trim()) return true;
    const q = modSearch.toLowerCase();
    return (
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.whatsapp || '').toLowerCase().includes(q) ||
      (p.zone || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="font-body-md text-body-md text-secondary">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8 space-y-space-md pt-2">
      {/* Cabecera compacta solo en vista Mi Perfil */}
      {!isModeratorView && (
        <div className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary-container p-space-md shadow-md">
          <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 font-label-sm text-[11px] uppercase tracking-wider font-extrabold mb-1.5">
                <span className="material-symbols-outlined text-xs">
                  {isSuperAdmin ? 'crown' : isAdmin ? 'admin_panel_settings' : 'shield_person'}
                </span>
                {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrador' : roleInfo.badge}
              </span>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold truncate">
                {user ? profile?.full_name || user.email : 'Mi Cuenta'}
              </h1>
            </div>

            {profile?.verification_status === 'pending' && !canUseCadeteTools && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-300 text-black font-label-sm text-label-sm font-extrabold">
                <span className="material-symbols-outlined text-xs">schedule</span>
                En Revisión
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alerta si la cuenta fue suspendida por un Moderador */}
      {isBanned && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error space-y-1 shadow-sm">
          <div className="flex items-center gap-2 font-label-lg text-label-lg font-extrabold">
            <span className="material-symbols-outlined">block</span>
            <span>Cuenta Suspendida</span>
          </div>
          <p className="font-body-sm text-body-sm">
            Tu cuenta fue restringida por incumplir las normas de la comunidad.
          </p>
        </div>
      )}

      {/* Mensajes de Feedback / Error */}
      {feedback && (
        <div className="p-3 rounded-xl bg-tertiary-container/15 text-tertiary font-body-sm text-body-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* VISTA 1: PANEL DE MODERACIÓN LIMPIO (/moderador) */}
      {isModeratorView ? (
        isAdmin && (
          <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-md space-y-3 border border-surface-container">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                </div>
                <div className="min-w-0">
                  <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold truncate">
                    Panel de Control
                  </h1>
                  <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-primary font-extrabold">
                    {isSuperAdmin ? '👑 Super Admin' : '🛡️ Administrador'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchModerationData}
                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface active:scale-90 transition-transform flex-shrink-0"
                title="Actualizar"
              >
                <span
                  className={`material-symbols-outlined text-lg ${
                    modLoading ? 'animate-spin' : ''
                  }`}
                >
                  refresh
                </span>
              </button>
            </div>

            {/* Pestañas del Panel de Control */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-low rounded-xl">
              <button
                type="button"
                onClick={() => setModTab('pending')}
                className={`py-2 px-2 rounded-lg font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 transition-all ${
                  modTab === 'pending'
                    ? 'bg-primary-container text-on-primary-container shadow-xs'
                    : 'text-secondary'
                }`}
              >
                <span>Solicitudes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
                  {pendingRequests.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModTab('users')}
                className={`py-2 px-2 rounded-lg font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 transition-all ${
                  modTab === 'users'
                    ? 'bg-primary-container text-on-primary-container shadow-xs'
                    : 'text-secondary'
                }`}
              >
                <span>Usuarios ({modProfiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModTab('alerts')}
                className={`py-2 px-2 rounded-lg font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 transition-all ${
                  modTab === 'alerts'
                    ? 'bg-primary-container text-on-primary-container shadow-xs'
                    : 'text-secondary'
                }`}
              >
                <span>Alertas ({modAlerts.length})</span>
              </button>
            </div>

            {/* TAB 1: Solicitudes Pendientes */}
            {modTab === 'pending' && (
              <div className="space-y-2.5 pt-1">
                {pendingRequests.length === 0 ? (
                  <div className="p-4 rounded-xl bg-surface-container-low text-center space-y-1">
                    <span className="material-symbols-outlined text-2xl text-tertiary">
                      task_alt
                    </span>
                    <p className="font-label-md text-label-md text-on-surface font-bold">
                      Sin solicitudes pendientes
                    </p>
                  </div>
                ) : (
                  pendingRequests.map((reqUser) => {
                    const cleanWa = (reqUser.whatsapp || '').replace(/\D/g, '');
                    const reqHasCustomPhoto = hasCustomProfilePhoto(reqUser);
                    return (
                      <div
                        key={reqUser.id}
                        className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => setExpandedPhotoUser(reqUser)}
                              className="relative group flex-shrink-0 cursor-zoom-in rounded-xl overflow-hidden focus:outline-none"
                              title="Tocar para ampliar foto"
                            >
                              <img
                                src={reqUser.avatar_url || DEFAULT_AVATAR_URL}
                                alt={reqUser.full_name || 'Solicitante'}
                                className="w-14 h-14 rounded-xl object-cover border border-surface-container-high group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center">
                                <span className="material-symbols-outlined text-[11px]">
                                  zoom_in
                                </span>
                              </span>
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-label-lg text-label-lg text-on-surface font-extrabold truncate">
                                  {reqUser.full_name || 'Sin nombre'}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 font-label-sm text-[10px] font-extrabold">
                                  {reqUser.vehicle || 'Moto'} • {reqUser.zone || 'Jujuy'}
                                </span>
                              </div>
                              <p className="font-body-sm text-body-sm text-secondary truncate">
                                {reqUser.email}
                              </p>
                              <p className="font-label-md text-label-md text-primary font-extrabold mt-0.5">
                                📱 {reqUser.whatsapp || 'Sin WhatsApp'}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-extrabold ${
                                  reqHasCustomPhoto
                                    ? 'bg-tertiary-container/20 text-tertiary'
                                    : 'bg-amber-300/60 text-amber-950'
                                }`}
                              >
                                {reqHasCustomPhoto
                                  ? '📸 Foto propia'
                                  : '⚠️ Foto por defecto'}
                              </span>
                            </div>
                          </div>

                          {cleanWa && (
                            <a
                              href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                                `Hola ${reqUser.full_name || ''}, soy administrador de Comuna Rider Jujuy.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold flex items-center gap-1 active:scale-95"
                            >
                              <span className="material-symbols-outlined text-sm">chat</span>
                              WhatsApp
                            </a>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleModerateUser(
                                reqUser.id,
                                {
                                  role: 'cadete_verificado',
                                  verification_status: 'approved',
                                  is_banned: false,
                                },
                                `✅ ${reqUser.full_name || reqUser.email} aprobado como Cadete.`,
                                reqUser
                              )
                            }
                            className="h-9 px-2 rounded-lg bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Aprobar N2
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleModerateUser(
                                reqUser.id,
                                {
                                  role: 'cadete_emprendedor',
                                  verification_status: 'approved',
                                  is_banned: false,
                                },
                                `🛍️ ${reqUser.full_name || reqUser.email} habilitado en Feria.`,
                                reqUser
                              )
                            }
                            className="h-9 px-2 rounded-lg bg-primary-fixed text-primary font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                          >
                            <span className="material-symbols-outlined text-sm">storefront</span>
                            Aprobar Feria
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectUserPhoto(reqUser)}
                            className="h-9 px-2 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Rechazar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: Gestión de Usuarios, Permisos y Admins */}
            {modTab === 'users' && (
              <div className="space-y-2.5 pt-1">
                <input
                  type="text"
                  value={modSearch}
                  onChange={(e) => setModSearch(e.target.value)}
                  placeholder="Buscar por nombre, email o WhatsApp..."
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
                />

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
                  {filteredModProfiles.map((u) => {
                    const targetIsSuperAdmin = isProfileSuperAdmin(u);
                    const targetIsAdmin = u.role === 'admin';
                    const canEditTarget =
                      !targetIsSuperAdmin && (isSuperAdmin || !targetIsAdmin);

                    return (
                      <div
                        key={u.id}
                        className={`p-2.5 rounded-xl border space-y-2 ${
                          u.is_banned
                            ? 'bg-error-container/30 border-error'
                            : targetIsSuperAdmin
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-surface-container-low border-surface-container-high'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => setExpandedPhotoUser(u)}
                              className="relative group flex-shrink-0 cursor-zoom-in rounded-full overflow-hidden focus:outline-none"
                              title="Tocar para ampliar foto"
                            >
                              <img
                                src={u.avatar_url || DEFAULT_AVATAR_URL}
                                alt={u.full_name || 'Usuario'}
                                className="w-10 h-10 rounded-full object-cover border border-surface-container-high group-hover:scale-105 transition-transform"
                              />
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-label-md text-label-md text-on-surface font-extrabold truncate">
                                  {u.full_name || 'Usuario'}{' '}
                                  {u.is_banned && (
                                    <span className="text-error font-extrabold">(BANEADO)</span>
                                  )}
                                </p>
                                {targetIsSuperAdmin ? (
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-300/80 text-amber-950 font-label-sm text-[9px] font-extrabold">
                                    👑 Super Admin
                                  </span>
                                ) : targetIsAdmin ? (
                                  <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-primary font-label-sm text-[9px] font-extrabold">
                                    🛡️ Admin
                                  </span>
                                ) : (
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full font-label-sm text-[9px] font-extrabold ${
                                      hasCustomProfilePhoto(u)
                                        ? 'bg-tertiary-container/20 text-tertiary'
                                        : 'bg-surface-container text-secondary'
                                    }`}
                                  >
                                    {hasCustomProfilePhoto(u) ? '📸 Foto' : 'Sin foto'}
                                  </span>
                                )}
                              </div>
                              <p className="font-body-sm text-[11px] text-secondary truncate">
                                {u.email} {u.whatsapp ? `• ${u.whatsapp}` : ''}
                              </p>
                            </div>
                          </div>

                          {canEditTarget && (
                            <button
                              type="button"
                              onClick={() =>
                                handleModerateUser(
                                  u.id,
                                  { is_banned: !u.is_banned },
                                  u.is_banned
                                    ? `Usuario ${u.full_name || u.email} desbaneado.`
                                    : `🚫 Usuario ${u.full_name || u.email} baneado.`,
                                  u
                                )
                              }
                              className={`px-2.5 py-1 rounded-full font-label-sm text-[10px] font-extrabold flex-shrink-0 ${
                                u.is_banned
                                  ? 'bg-tertiary-container text-on-tertiary-container'
                                  : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {u.is_banned ? 'Desbanear' : 'Banear'}
                            </button>
                          )}
                        </div>

                        {canEditTarget ? (
                          <div className="flex items-center gap-2">
                            <span className="font-label-sm text-[10px] text-secondary uppercase font-bold">
                              Rol:
                            </span>
                            <select
                              value={u.role || 'ciudadano'}
                              onChange={(e) =>
                                handleModerateUser(
                                  u.id,
                                  {
                                    role: e.target.value,
                                    verification_status:
                                      e.target.value === 'ciudadano' ? 'none' : 'approved',
                                  },
                                  `Rol de ${u.full_name || u.email} actualizado.`,
                                  u
                                )
                              }
                              className="flex-1 h-8 px-2 rounded-lg bg-surface-container-lowest font-label-sm text-label-sm text-on-surface border border-surface-container-high"
                            >
                              <option value="ciudadano">Ciudadano</option>
                              <option value="cadete_verificado">Cadete Verificado</option>
                              <option value="cadete_emprendedor">Emprendedor (Feria)</option>
                              {isSuperAdmin && <option value="admin">Administrador</option>}
                            </select>
                          </div>
                        ) : (
                          <p className="font-label-sm text-[10px] text-secondary font-bold">
                            {targetIsSuperAdmin
                              ? '🔒 Cuenta Super Admin protegida'
                              : '🔒 Solo el Super Admin puede modificar administradores'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Moderar y Borrar Alertas del Mapa */}
            {modTab === 'alerts' && (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pt-1">
                {modAlerts.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-secondary text-center py-4">
                    No hay alertas activas para moderar.
                  </p>
                ) : (
                  modAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-label-sm text-[10px] text-primary font-extrabold uppercase">
                          {a.zone} • {a.badge}
                        </span>
                        <p className="font-label-md text-label-md text-on-surface font-bold truncate">
                          {a.title}
                        </p>
                        <p className="font-body-sm text-[11px] text-secondary truncate">
                          Por: {a.author_name || 'Usuario'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleModerateDeleteAlert(a.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm font-extrabold flex items-center gap-1 flex-shrink-0 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Borrar
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )
      ) : !user ? (
        /* VISTA 2 (NO LOGUEADO): Login y Registro */
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-4 border border-surface-container/50">
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-full">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
              }}
              className={`h-10 rounded-full font-label-md text-label-md font-bold transition-all ${
                authMode === 'login'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-secondary'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
              }}
              className={`h-10 rounded-full font-label-md text-label-md font-bold transition-all ${
                authMode === 'register'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-secondary'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Nombre o Apodo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Nico R."
                    className="w-full h-12 px-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Zona Habitual
                  </label>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                  >
                    {ZONES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+54 9 388 4123456"
                    className="w-full h-12 px-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@jujuy.com"
                className="w-full h-12 px-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full h-12 px-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                {authMode === 'register' ? 'person_add' : 'login'}
              </span>
              {submitting
                ? 'Procesando...'
                : authMode === 'register'
                ? 'Crear Cuenta'
                : 'Ingresar con Email'}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-surface-container"></div>
            <span className="flex-shrink mx-3 font-label-sm text-label-sm text-secondary uppercase">
              O
            </span>
            <div className="flex-grow border-t border-surface-container"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-full bg-surface-container-low text-on-surface font-label-lg text-label-lg font-bold border border-surface-container-high flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg text-primary">account_circle</span>
            Continuar con Google
          </button>
        </div>
      ) : (
        /* VISTA 3 (LOGUEADO EN /perfil): Solo Mi Perfil personal */
        <>
          {!canUseCadeteTools && (
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3 border border-primary/30">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">two_wheeler</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                  Validar Cuenta de Cadete
                </h2>
              </div>

              {profile?.verification_status === 'pending' && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 font-body-sm text-body-sm text-on-surface font-semibold">
                  ⏳ Solicitud en revisión ({profile?.whatsapp || 'sin WhatsApp'}).
                </div>
              )}

              <form onSubmit={handleRequestVerification} className="space-y-3">
                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Número de WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+54 9 388 412-3456"
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none border border-surface-container-high"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                      Vehículo
                    </label>
                    <select
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                    >
                      <option value="Moto">Moto</option>
                      <option value="Bici">Bici</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                      Zona
                    </label>
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                    >
                      {ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md font-extrabold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                  {submitting
                    ? 'Enviando...'
                    : profile?.verification_status === 'pending'
                    ? 'Actualizar Solicitud'
                    : 'Solicitar Verificación'}
                </button>
              </form>
            </div>
          )}

          {/* Gestión de Datos Personales */}
          <form
            onSubmit={handleSaveProfile}
            className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-4 border border-surface-container/50"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">tune</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Mis Datos de Perfil
              </h2>
            </div>

            {/* Foto de Perfil Propia */}
            <div
              ref={photoCardRef}
              className={`p-3 rounded-xl border transition-all space-y-2 ${
                highlightPhotoCard
                  ? 'bg-primary-fixed/30 border-primary ring-2 ring-primary/40 shadow-md'
                  : profile?.verification_status === 'rejected'
                  ? 'bg-error-container/25 border-error/50'
                  : 'bg-surface-container-low border-surface-container-high'
              }`}
            >
              {highlightPhotoCard && (
                <p className="font-label-sm text-[11px] text-primary font-extrabold">
                  📸 Subí tu foto de perfil acá.
                </p>
              )}

              <div className="flex items-center gap-3">
                <img
                  src={profile?.avatar_url || DEFAULT_AVATAR_URL}
                  alt="Mi Foto de Perfil"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-extrabold ${
                      profile?.verification_status === 'rejected'
                        ? 'bg-error-container text-on-error-container'
                        : profile?.verification_status === 'pending' && hasCustomPhoto
                        ? 'bg-amber-300/80 text-amber-950'
                        : hasCustomPhoto
                        ? 'bg-tertiary-container/20 text-tertiary'
                        : 'bg-amber-300/70 text-amber-950'
                    }`}
                  >
                    {isAdmin && hasCustomPhoto
                      ? '📸 Foto aprobada'
                      : profile?.verification_status === 'rejected'
                      ? '❌ Foto rechazada'
                      : profile?.verification_status === 'pending' && hasCustomPhoto
                      ? '⏳ En revisión'
                      : profile?.verification_status === 'approved' && hasCustomPhoto
                      ? '✅ Foto aprobada'
                      : hasCustomPhoto
                      ? '📸 Foto cargada'
                      : '🖼️ Foto por defecto'}
                  </span>

                  {profile?.verification_status === 'rejected' && (
                    <p className="font-body-sm text-[11px] text-error leading-snug font-semibold">
                      Subí una foto clara donde se te reconozca.
                    </p>
                  )}

                  <div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-extrabold cursor-pointer active:scale-95">
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      <span>{uploadingAvatar ? 'Subiendo...' : 'Cambiar Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingAvatar}
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Disponible / En Pausa */}
            {canUseCadeteTools && (
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1.5">
                  Estado de Turno
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('online')}
                    className={`h-11 rounded-full font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 transition-all ${
                      status === 'online'
                        ? 'bg-tertiary-container text-on-tertiary-container shadow-sm'
                        : 'bg-surface-container-low text-secondary'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    Disponible
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('paused')}
                    className={`h-11 rounded-full font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 transition-all ${
                      status === 'paused'
                        ? 'bg-inverse-surface text-inverse-on-surface shadow-sm'
                        : 'bg-surface-container-low text-secondary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">pause_circle</span>
                    En Pausa
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Nombre / Apodo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+54 9 388..."
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Zona
                </label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                >
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                  Vehículo
                </label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                >
                  <option value="Moto">Moto</option>
                  <option value="Bici">Bici</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              {submitting ? 'Guardando...' : 'Guardar Mis Datos'}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full h-11 rounded-full bg-surface-container-highest text-on-surface font-label-md text-label-md font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Cerrar Sesión
            </button>
          </form>
        </>
      )}

      {/* Configuración Supabase únicamente si falta configurar .env */}
      {!isSupabaseConfigured && (
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface font-bold">
              Configuración Supabase Pendiente
            </span>
            <button
              type="button"
              onClick={() => setShowConfigForm((prev) => !prev)}
              className="font-label-sm text-label-sm text-primary font-bold underline"
            >
              {showConfigForm ? 'Ocultar' : 'Configurar'}
            </button>
          </div>

          {showConfigForm && (
            <div className="pt-2 space-y-2 border-t border-surface-container">
              <input
                type="url"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://tu-proyecto.supabase.co"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
              />
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="VITE_SUPABASE_ANON_KEY"
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveRuntimeSupabaseConfig(sbUrl, sbKey)}
                  className="flex-1 h-10 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md font-bold shadow-sm"
                >
                  Guardar y Conectar
                </button>
                <button
                  type="button"
                  onClick={() => clearRuntimeSupabaseConfig()}
                  className="px-4 h-10 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-bold"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX ADMIN: Ampliar Foto de Perfil para Verificar */}
      {isAdmin && expandedPhotoUser && (
        <div
          onClick={() => setExpandedPhotoUser(null)}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest w-full max-w-sm rounded-2xl p-space-md shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold truncate">
                  {expandedPhotoUser.full_name || 'Usuario'}
                </h3>
                <p className="font-body-sm text-[11px] text-secondary truncate">
                  {expandedPhotoUser.email}
                  {expandedPhotoUser.whatsapp ? ` • ${expandedPhotoUser.whatsapp}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedPhotoUser(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary flex-shrink-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-surface-container border border-surface-container-high">
              <img
                src={expandedPhotoUser.avatar_url || DEFAULT_AVATAR_URL}
                alt={expandedPhotoUser.full_name || 'Foto de perfil'}
                className="w-full max-h-[60vh] object-contain mx-auto"
              />
            </div>

            {!isProfileSuperAdmin(expandedPhotoUser) &&
              (isSuperAdmin || expandedPhotoUser.role !== 'admin') && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleModerateUser(
                        expandedPhotoUser.id,
                        {
                          role: 'cadete_emprendedor',
                          verification_status: 'approved',
                          is_banned: false,
                        },
                        `🛍️ ${expandedPhotoUser.full_name || expandedPhotoUser.email} habilitado en Feria.`,
                        expandedPhotoUser
                      )
                    }
                    className="h-11 rounded-xl bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Aprobar Feria
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectUserPhoto(expandedPhotoUser)}
                    className="h-11 rounded-xl bg-error-container text-on-error-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                    Rechazar Foto
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
