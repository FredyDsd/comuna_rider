import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, ROLES_INFO } from '../context/AuthContext';
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

export default function PerfilPage() {
  const {
    user,
    profile,
    role,
    roleInfo,
    loading,
    isBanned,
    canUseCadeteTools,
    isAdmin,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    updateProfile,
    requestCadeteVerification,
    refreshProfile,
    signOut,
  } = useAuth();

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

  // Cargar datos del Panel de Control si el usuario es Nivel 4 (Moderador)
  const fetchModerationData = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) return;
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
      if (alertsData) setModAlerts(alertsData);
    } catch (err) {
      console.warn('Error cargando datos de moderación:', err);
    } finally {
      setModLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchModerationData();
    }
  }, [isAdmin, fetchModerationData]);

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
            'Registro exitoso en Supabase. Revisá tu correo para confirmar la cuenta o iniciá sesión.'
          );
        } else {
          setFeedback(
            '¡Cuenta creada como Nivel 1 (Ciudadano)! Ya podés aportar alertas al mapa o solicitar tu verificación de Cadete abajo.'
          );
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

  // Acciones del Moderador (Nivel 4)
  const handleModerateUser = async (targetUserId, updates, successText) => {
    setErrorMsg(null);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (error) throw error;

      setModProfiles((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, ...updates } : p))
      );
      if (targetUserId === user?.id) {
        await refreshProfile();
      }
      setFeedback(successText);
    } catch (err) {
      setErrorMsg(`Error al moderar usuario: ${err.message}`);
    }
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

  // Cambio rápido de rol propio para facilitar pruebas de los 4 niveles
  const handleQuickRoleSwitch = async (newRole) => {
    setErrorMsg(null);
    setFeedback(null);
    try {
      await updateProfile({
        role: newRole,
        verification_status: newRole === 'ciudadano' ? 'none' : 'approved',
      });
      setFeedback(`Rol cambiado a ${ROLES_INFO[newRole]?.badge} para prueba.`);
    } catch (err) {
      setErrorMsg(`No se pudo cambiar el rol: ${err.message}`);
    }
  };

  const pendingRequests = modProfiles.filter((p) => p.verification_status === 'pending');
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
        <p className="font-body-md text-body-md text-secondary">
          Cargando perfil desde Supabase...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-8 space-y-space-md pt-2">
      {/* Banner de Nivel Actual según USUARIOS.md */}
      <div className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary-container p-space-md shadow-md">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md font-label-sm text-label-sm uppercase tracking-wider font-extrabold">
              <span className="material-symbols-outlined text-sm">shield_person</span>
              {roleInfo.badge}
            </span>

            {profile?.verification_status === 'pending' && !canUseCadeteTools && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-300 text-black font-label-sm text-label-sm font-extrabold">
                <span className="material-symbols-outlined text-xs">schedule</span>
                Verificación en Revisión
              </span>
            )}

            {role === 'cadete_emprendedor' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-extrabold">
                <span className="material-symbols-outlined text-xs">verified</span>
                Vendedor Confiable
              </span>
            )}

            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-extrabold">
                <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                Admin WhatsApp
              </span>
            )}
          </div>

          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold">
            {user ? profile?.full_name || user.email : 'Ciudadano (Sin sesión)'}
          </h1>
          <p className="font-body-sm text-body-sm text-on-primary-container/90">
            {roleInfo.description}
          </p>

          {user && (
            <div className="pt-1 flex items-center gap-2 text-on-primary-container/80 font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-xs">fingerprint</span>
              <span className="truncate">ID: {user.id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerta si la cuenta fue suspendida por un Moderador */}
      {isBanned && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error space-y-1 shadow-sm">
          <div className="flex items-center gap-2 font-label-lg text-label-lg font-extrabold">
            <span className="material-symbols-outlined">block</span>
            <span>Cuenta Suspendida por Moderación</span>
          </div>
          <p className="font-body-sm text-body-sm">
            Tu cuenta fue restringida por un moderador por incumplir las normas de la comunidad.
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

      {/* VISTA NO LOGUEADO: Login y Registro en Supabase */}
      {!user ? (
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
                    Zona Habitual en Jujuy
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
                    WhatsApp (Opcional, para turnos y SOS)
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

            {authMode === 'register' && (
              <div className="p-2.5 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-secondary flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base mt-0.5">
                  info
                </span>
                <span>
                  Ingresás como <strong className="text-on-surface">Nivel 1 (Ciudadano)</strong> con
                  acceso a reportar en el Mapa y usar el Directorio. Si sos cadete, luego podrás
                  validar tu WhatsApp para habilitar Turnos, Calculadora y Mercado.
                </span>
              </div>
            )}

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
                ? 'Crear Cuenta (Nivel 1 Ciudadano)'
                : 'Ingresar con Email'}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-surface-container"></div>
            <span className="flex-shrink mx-3 font-label-sm text-label-sm text-secondary uppercase">
              O ingresar con
            </span>
            <div className="flex-grow border-t border-surface-container"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-full bg-surface-container-low text-on-surface font-label-lg text-label-lg font-bold border border-surface-container-high flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg text-primary">account_circle</span>
            Continuar con Google (Supabase OAuth)
          </button>
        </div>
      ) : (
        <>
          {/* FLUJO DE VERIFICACIÓN DE CADETE (Visible para Nivel 1 Ciudadano) */}
          {!canUseCadeteTools && (
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3 border-2 border-primary/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">two_wheeler</span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                      ¿Sos Cadete en Jujuy?
                    </h2>
                    <p className="font-body-sm text-body-sm text-secondary">
                      Desbloqueá Turnos, Calculadora y Mercado Cadete (Nivel 2)
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-[10px] font-extrabold uppercase flex-shrink-0">
                  Nivel 1 → 2
                </span>
              </div>

              {profile?.verification_status === 'pending' ? (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface font-extrabold">
                    <span className="material-symbols-outlined text-amber-600 text-lg">
                      hourglass_top
                    </span>
                    <span>Solicitud en revisión por los Moderadores</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Enviaste el WhatsApp{' '}
                    <strong className="text-on-surface">{profile?.whatsapp}</strong> ({profile?.vehicle}{' '}
                    • {profile?.zone}). Un administrador de los grupos de WhatsApp aprobará tu
                    cuenta en breve.
                  </p>
                </div>
              ) : (
                <p className="font-body-sm text-body-sm text-secondary">
                  Ingresá tu número de WhatsApp para que los administradores de los grupos de
                  cadetes de Jujuy validen tu identidad y habiliten tus herramientas de trabajo.
                </p>
              )}

              <form onSubmit={handleRequestVerification} className="space-y-3 pt-1">
                <div>
                  <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                    Tu Número de WhatsApp (Con característica)
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
                      Vehículo de Reparto
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
                      Zona de Trabajo
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
                  className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-extrabold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                  {submitting
                    ? 'Enviando solicitud...'
                    : profile?.verification_status === 'pending'
                    ? 'Actualizar WhatsApp de Solicitud'
                    : 'Solicitar Verificación de Cadete (Nivel 2)'}
                </button>
              </form>
            </div>
          )}

          {/* PANEL DE CONTROL DE MODERADORES (Exclusivo Nivel 4 Admin) */}
          {isAdmin && (
            <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-md space-y-3 border-2 border-primary-container">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                      Panel de Moderación
                    </h2>
                    <p className="font-body-sm text-body-sm text-secondary">
                      Administradores de WhatsApp • Jujuy
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchModerationData}
                  className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface active:scale-90 transition-transform"
                  title="Actualizar solicitudes"
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

              {/* TAB 1: Solicitudes Pendientes de Nivel 2 */}
              {modTab === 'pending' && (
                <div className="space-y-2.5 pt-1">
                  {pendingRequests.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface-container-low text-center space-y-1">
                      <span className="material-symbols-outlined text-2xl text-tertiary">
                        task_alt
                      </span>
                      <p className="font-label-md text-label-md text-on-surface font-bold">
                        No hay solicitudes pendientes de revisión
                      </p>
                      <p className="font-body-sm text-body-sm text-secondary">
                        Cuando un usuario Nivel 1 envíe su WhatsApp aparecerá aquí.
                      </p>
                    </div>
                  ) : (
                    pendingRequests.map((reqUser) => {
                      const cleanWa = (reqUser.whatsapp || '').replace(/\D/g, '');
                      return (
                        <div
                          key={reqUser.id}
                          className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
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
                                📱 WhatsApp: {reqUser.whatsapp || 'No especificado'}
                              </p>
                            </div>

                            {cleanWa && (
                              <a
                                href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                                  `Hola ${reqUser.full_name || ''}, soy moderador de Comuna Rider Jujuy. Recibimos tu solicitud de verificación como Cadete.`
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
                                  `✅ ${reqUser.full_name || reqUser.email} aprobado como Nivel 2 (Cadete Verificado).`
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
                                  `🛍️ ${reqUser.full_name || reqUser.email} aprobado como Nivel 3 (Emprendedor).`
                                )
                              }
                              className="h-9 px-2 rounded-lg bg-primary-fixed text-primary font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                            >
                              <span className="material-symbols-outlined text-sm">storefront</span>
                              Aprobar N3
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleModerateUser(
                                  reqUser.id,
                                  {
                                    role: 'ciudadano',
                                    verification_status: 'rejected',
                                  },
                                  `Solicitud de ${reqUser.full_name || reqUser.email} rechazada.`
                                )
                              }
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

              {/* TAB 2: Gestión de Usuarios, Roles y Baneos */}
              {modTab === 'users' && (
                <div className="space-y-2.5 pt-1">
                  <input
                    type="text"
                    value={modSearch}
                    onChange={(e) => setModSearch(e.target.value)}
                    placeholder="Buscar por nombre, email o WhatsApp..."
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface focus:outline-none"
                  />

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                    {filteredModProfiles.map((u) => (
                      <div
                        key={u.id}
                        className={`p-2.5 rounded-xl border space-y-2 ${
                          u.is_banned
                            ? 'bg-error-container/30 border-error'
                            : 'bg-surface-container-low border-surface-container-high'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-label-md text-label-md text-on-surface font-extrabold truncate">
                              {u.full_name || 'Usuario'}{' '}
                              {u.is_banned && (
                                <span className="text-error font-extrabold">(BANEADO)</span>
                              )}
                            </p>
                            <p className="font-body-sm text-[11px] text-secondary truncate">
                              {u.email} {u.whatsapp ? `• ${u.whatsapp}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleModerateUser(
                                u.id,
                                { is_banned: !u.is_banned },
                                u.is_banned
                                  ? `Usuario ${u.full_name || u.email} desbaneado.`
                                  : `🚫 Usuario ${u.full_name || u.email} baneado.`
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
                        </div>

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
                                `Rol de ${u.full_name || u.email} actualizado a ${e.target.value}.`
                              )
                            }
                            className="flex-1 h-8 px-2 rounded-lg bg-surface-container-lowest font-label-sm text-label-sm text-on-surface border border-surface-container-high"
                          >
                            <option value="ciudadano">Nivel 1: Ciudadano</option>
                            <option value="cadete_verificado">Nivel 2: Cadete Verificado</option>
                            <option value="cadete_emprendedor">Nivel 3: Emprendedor</option>
                            <option value="admin">Nivel 4: Moderador</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Moderar y Borrar Alertas del Mapa */}
              {modTab === 'alerts' && (
                <div className="space-y-2 max-h-80 overflow-y-auto pt-1">
                  {modAlerts.length === 0 ? (
                    <p className="font-body-sm text-body-sm text-secondary text-center py-4">
                      No hay alertas guardadas en la base de datos de Supabase.
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
                            Por: {a.author_name || 'Vecino/Cadete'}
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
          )}

          {/* VISTA LOGUEADO: Gestión de Datos Personales */}
          <form
            onSubmit={handleSaveProfile}
            className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-4 border border-surface-container/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                  Mis Datos de Perfil
                </h2>
              </div>
              {canUseCadeteTools && (
                <span className="px-2.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-label-sm font-extrabold">
                  Score {profile?.score ?? 98}%
                </span>
              )}
            </div>

            {/* Toggle Disponible / En Pausa (Solo Cadetes Nivel 2+) */}
            {canUseCadeteTools && (
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1.5">
                  Estado de Turno Actual
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
                    Disponible (En Ruta)
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
                  Zona Frecuente
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
              {submitting ? 'Guardando en Supabase...' : 'Guardar Mis Datos'}
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

          {/* Conmutador Rápido de Roles (Para probar las vistas N1, N2, N3 y Moderador N4 al instante) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-2 border border-dashed border-secondary/40">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase text-secondary font-extrabold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">science</span>
                Simulador Rápido de Roles (Test)
              </span>
              <span className="font-label-sm text-[10px] text-secondary">1 clic en Supabase</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { code: 'ciudadano', label: 'N1 • Ciudadano' },
                { code: 'cadete_verificado', label: 'N2 • Cadete' },
                { code: 'cadete_emprendedor', label: 'N3 • Emprendedor' },
                { code: 'admin', label: 'N4 • Moderador' },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleQuickRoleSwitch(item.code)}
                  className={`h-9 px-2.5 rounded-lg font-label-sm text-label-sm font-bold transition-all ${
                    role === item.code
                      ? 'bg-primary-container text-on-primary-container font-extrabold shadow-xs'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tabla Resumen de Niveles de USUARIOS.md */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-2.5 border border-surface-container/50">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
          <h3 className="font-label-lg text-label-lg text-on-surface font-extrabold">
            Jerarquía de Roles (USUARIOS.md)
          </h3>
        </div>
        <div className="space-y-2">
          {['ciudadano', 'cadete_verificado', 'cadete_emprendedor', 'admin'].map((code) => {
            const r = ROLES_INFO[code];
            const isCurrent = role === r.code || (!user && code === 'ciudadano');
            return (
              <div
                key={r.code}
                className={`p-2.5 rounded-lg border ${
                  isCurrent
                    ? 'bg-primary-fixed/30 border-primary-container'
                    : 'bg-surface-container-low/60 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface font-bold">
                    Nivel {r.level}: {r.name}
                  </span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm uppercase">
                      Actual
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-secondary mt-0.5">{r.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estado de Conexión a Supabase (.env o Runtime) */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSupabaseConfigured ? 'bg-tertiary animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span className="font-label-md text-label-md text-on-surface font-bold">
              {isSupabaseConfigured ? 'Supabase Conectado' : 'Configuración Supabase Pendiente'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowConfigForm((prev) => !prev)}
            className="font-label-sm text-label-sm text-primary font-bold underline"
          >
            {showConfigForm ? 'Ocultar claves' : 'Configurar URL/Key'}
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
    </div>
  );
}
