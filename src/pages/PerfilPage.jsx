import React, { useState, useEffect } from 'react';
import { useAuth, ROLES_INFO } from '../context/AuthContext';
import {
  isSupabaseConfigured,
  saveRuntimeSupabaseConfig,
  clearRuntimeSupabaseConfig,
} from '../lib/supabase';

const ZONES = ['Centro', 'Alto Comedero', 'Nueva Terminal', 'Cuyaya', 'Chijra', 'Los Perales', 'Palpalá'];

export default function PerfilPage() {
  const {
    user,
    profile,
    role,
    roleInfo,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    updateProfile,
    signOut,
  } = useAuth();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicle, setVehicle] = useState('Moto');
  const [zone, setZone] = useState('Centro');
  const [selectedRole, setSelectedRole] = useState('cadete_verificado');
  const [status, setStatus] = useState('online');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Configuración rápida de credenciales Supabase si .env aún tiene placeholders
  const [sbUrl, setSbUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [sbKey, setSbKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [showConfigForm, setShowConfigForm] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setVehicle(profile.vehicle || 'Moto');
      setZone(profile.zone || 'Centro');
      setSelectedRole(profile.role || 'cadete_verificado');
      setStatus(profile.status || 'online');
    }
  }, [profile]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      if (authMode === 'register') {
        const res = await signUpWithEmail({
          email,
          password,
          fullName: fullName.trim() || 'Cadete Jujuy',
          vehicle,
          zone,
        });
        if (res?.user && !res?.session) {
          setFeedback(
            'Registro exitoso en Supabase. Revisá tu correo para confirmar la cuenta o iniciá sesión si desactivaste Confirm Email.'
          );
        } else {
          setFeedback('¡Cuenta registrada! Perfil Nivel 2 (Cadete Verificado) guardado en Supabase.');
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
        full_name: fullName.trim() || 'Cadete Jujuy',
        vehicle,
        zone,
        role: selectedRole,
        status,
      });
      setFeedback('Estado y nivel del cadete actualizados en Supabase.');
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el perfil en Supabase.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md font-label-sm text-label-sm uppercase tracking-wider font-extrabold">
              <span className="material-symbols-outlined text-sm">shield_person</span>
              {roleInfo.badge}
            </span>
            {role === 'cadete_emprendedor' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-extrabold">
                <span className="material-symbols-outlined text-xs">verified</span>
                Vendedor Confiable
              </span>
            )}
          </div>

          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold">
            {user ? profile?.full_name || user.email : 'Visitante / Novato'}
          </h1>
          <p className="font-body-sm text-body-sm text-on-primary-container/90">
            {roleInfo.description}
          </p>

          {user && (
            <div className="pt-1 flex items-center gap-2 text-on-primary-container/80 font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-xs">fingerprint</span>
              <span className="truncate">ID Trazabilidad: {user.id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Estado de Conexión a Supabase (.env o Runtime) */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured ? 'bg-tertiary animate-pulse' : 'bg-amber-500'
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
            <p className="font-body-sm text-body-sm text-secondary">
              Podés configurar tus credenciales en el archivo <code>.env</code> o pegarlas aquí para conectar tu proyecto de Supabase al instante:
            </p>
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
              placeholder="VITE_SUPABASE_ANON_KEY (eyJ...)"
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
          {/* Selector Login / Registro */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-full">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
              }}
              className={`h-10 rounded-full font-label-md text-label-md font-bold transition-all ${authMode === 'login'
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
              className={`h-10 rounded-full font-label-md text-label-md font-bold transition-all ${authMode === 'register'
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
                    Nombre / Apodo de Cadete
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                      Vehículo
                    </label>
                    <select
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full h-12 px-3 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none"
                    >
                      <option value="Moto">Moto</option>
                      <option value="Bici">Bici</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
                      Zona Base Jujuy
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
                placeholder="cadete@jujuy.com"
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
              <div className="p-2.5 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                <span>
                  Al registrarte se te asigna automáticamente el rol base{' '}
                  <strong className="text-on-surface">Nivel 2: Cadete Verificado</strong> en Supabase.
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
                  ? 'Crear Cuenta de Cadete'
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
        /* VISTA LOGUEADO: Gestión de Mi Perfil y Nivel del Cadete */
        <form
          onSubmit={handleSaveProfile}
          className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-4 border border-surface-container/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">tune</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Mi Perfil y Estado Operativo
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-label-sm font-extrabold">
              Score {profile?.score ?? 98}%
            </span>
          </div>

          {/* Toggle Disponible / En Pausa */}
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1.5">
              Estado de Turno Actual
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('online')}
                className={`h-11 rounded-full font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 transition-all ${status === 'online'
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
                className={`h-11 rounded-full font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 transition-all ${status === 'paused'
                  ? 'bg-inverse-surface text-inverse-on-surface shadow-sm'
                  : 'bg-surface-container-low text-secondary'
                  }`}
              >
                <span className="material-symbols-outlined text-sm">pause_circle</span>
                En Pausa
              </button>
            </div>
          </div>

          {/* Nombre y Vehículo */}
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

          {/* Zona Operativa */}
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
              Zona Frecuente en Jujuy
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

          {/* Selector de Nivel / Rol según USUARIOS.md */}
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-secondary font-bold mb-1">
              Nivel de Acceso en Plataforma (USUARIOS.md)
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full h-12 px-3 rounded-xl bg-surface-container-low font-label-md text-label-md text-on-surface focus:outline-none"
            >
              <option value="cadete_verificado">
                Nivel 2: Cadete Verificado (Alertas en Mapa + Turnos)
              </option>
              <option value="cadete_emprendedor">
                Nivel 3: Cadete Emprendedor / Vendedor (+ Mercado Cadete)
              </option>
              <option value="admin">
                Nivel 4: Administrador (Moderación Total)
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            {submitting ? 'Guardando en Supabase...' : 'Guardar Cambios de Perfil'}
          </button>

          <button
            type="button"
            onClick={signOut}
            className="w-full h-11 rounded-full bg-surface-container-highest text-on-surface font-label-md text-label-md font-bold active:scale-95 transition-transform flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Cerrar Sesión (Volver a Nivel 1 Visitante)
          </button>
        </form>
      )}

      {/* Tabla Resumen de Niveles de USUARIOS.md */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-2.5 border border-surface-container/50">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
          <h3 className="font-label-lg text-label-lg text-on-surface font-extrabold">
            Permisos por Nivel de Usuario
          </h3>
        </div>
        <div className="space-y-2">
          {Object.values(ROLES_INFO).map((r) => {
            const isCurrent = role === r.code;
            return (
              <div
                key={r.code}
                className={`p-2.5 rounded-lg border ${isCurrent
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
    </div>
  );
}

