import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

export function hasCustomProfilePhoto(profile) {
  const url = (profile?.avatar_url || '').trim();
  if (!url) return false;
  if (url === DEFAULT_AVATAR_URL) return false;
  if (url.includes('photo-1534528741775-53994a69daeb')) return false;
  return true;
}

// Redimensiona y comprime una imagen a 360x360 JPEG para guardarla en profiles.avatar_url con nitidez al ampliar
export function compressAvatarFile(file, size = 360, quality = 0.84) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se seleccionó ningún archivo de imagen.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const ROLES_INFO = {
  visitante: {
    level: 1,
    code: 'visitante',
    name: 'Ciudadano (Sin sesión)',
    badge: 'Nivel 1 • Ciudadano',
    description:
      'Puede consultar el Mapa de Alertas y el Directorio de Servicios. Iniciá sesión para reportar alertas en el mapa.',
  },
  ciudadano: {
    level: 1,
    code: 'ciudadano',
    name: 'Ciudadano Registrado',
    badge: 'Nivel 1 • Ciudadano',
    description:
      'Usuario registrado base. Puede ver y aportar alertas al Mapa y ver la Feria. No ve Turnos ni Avisos y Noticias hasta ser verificado como Cadete.',
  },
  cadete_verificado: {
    level: 2,
    code: 'cadete_verificado',
    name: 'Cadete Verificado',
    badge: 'Nivel 2 • Cadete Verificado',
    description:
      'Cadete aprobado por los moderadores. Tiene acceso completo a todas las herramientas: Mapa, Turnos, Avisos y Noticias y Feria.',
  },
  cadete_emprendedor: {
    level: 3,
    code: 'cadete_emprendedor',
    name: 'Emprendedor',
    badge: 'Nivel 3 • Emprendedor',
    description:
      'Cadete verificado con permisos de venta en el Mercado Cadete y sello de Vendedor Confiable.',
  },
  admin: {
    level: 4,
    code: 'admin',
    name: 'Moderador',
    badge: 'Nivel 4 • Moderador',
    description:
      'Administrador de los grupos de WhatsApp. Puede aprobar solicitudes de Nivel 2/3, borrar alertas falsas y banear usuarios.',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = async (authUser, extraMeta = {}) => {
    if (!authUser || !isSupabaseConfigured) return null;

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (existing && !fetchError) {
        const patch = {};
        if (!existing.whatsapp && (extraMeta.whatsapp || authUser.user_metadata?.whatsapp)) {
          patch.whatsapp = extraMeta.whatsapp || authUser.user_metadata?.whatsapp;
        }
        if (!existing.avatar_url) {
          patch.avatar_url = DEFAULT_AVATAR_URL;
        }
        if (Object.keys(patch).length > 0) {
          const { data: updatedExisting } = await supabase
            .from('profiles')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', authUser.id)
            .select()
            .single();
          if (updatedExisting) {
            setProfile(updatedExisting);
            return updatedExisting;
          }
        }
        setProfile(existing);
        return existing;
      }

      const defaultProfile = {
        id: authUser.id,
        email: authUser.email || '',
        full_name:
          extraMeta.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0] ||
          'Vecino Jujuy',
        role: 'ciudadano',
        verification_status: 'none',
        whatsapp: extraMeta.whatsapp || authUser.user_metadata?.whatsapp || '',
        avatar_url: DEFAULT_AVATAR_URL,
        vehicle: extraMeta.vehicle || authUser.user_metadata?.vehicle || 'Moto',
        zone: extraMeta.zone || authUser.user_metadata?.zone || 'Centro',
        status: 'online',
        score: 98,
        is_banned: false,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .upsert(defaultProfile, { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
        console.warn('Aviso al sincronizar tabla profiles en Supabase:', insertError.message);
        setProfile(defaultProfile);
        return defaultProfile;
      }

      setProfile(inserted);
      return inserted;
    } catch (err) {
      console.error('Error cargando perfil:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user || !isSupabaseConfigured) return null;
    return ensureProfile(user);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await ensureProfile(currentUser);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await ensureProfile(currentUser);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUpWithEmail = async ({
    email,
    password,
    fullName,
    whatsapp = '',
    vehicle = 'Moto',
    zone = 'Centro',
  }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY primero.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          whatsapp,
          role: 'ciudadano',
          vehicle,
          zone,
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      await ensureProfile(data.user, {
        full_name: fullName,
        whatsapp,
        role: 'ciudadano',
        vehicle,
        zone,
      });
    }

    return data;
  };

  const signInWithEmail = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY primero.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data?.user) {
      await ensureProfile(data.user);
    }

    return data;
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY primero.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/perfil`,
      },
    });

    if (error) throw error;
    return data;
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Debes iniciar sesión para actualizar tu perfil.');

    const updatedPayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || user.email?.split('@')[0] || 'Vecino Jujuy',
          role: profile?.role || 'ciudadano',
          avatar_url: profile?.avatar_url || DEFAULT_AVATAR_URL,
          vehicle: profile?.vehicle || 'Moto',
          zone: profile?.zone || 'Centro',
          status: profile?.status || 'online',
          score: profile?.score ?? 98,
          ...updatedPayload,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw error;

    setProfile(data);
    return data;
  };

  // Nivel 1 envía solicitud de verificación con su número de WhatsApp
  const requestCadeteVerification = async ({ whatsapp, vehicle, zone }) => {
    if (!user) throw new Error('Iniciá sesión primero para solicitar la verificación.');
    return updateProfile({
      whatsapp: whatsapp.trim(),
      vehicle: vehicle || profile?.vehicle || 'Moto',
      zone: zone || profile?.zone || 'Centro',
      verification_status: 'pending',
      verification_requested_at: new Date().toISOString(),
    });
  };

  // Solicitud para publicar en "Mulitas Emprendedoras" (requiere foto propia + aprobación del Admin)
  const requestFeriaVerification = async ({ avatarUrl, whatsapp } = {}) => {
    if (!user) throw new Error('Iniciá sesión primero para solicitar permiso de publicación.');
    const updates = {
      verification_status: 'pending',
      verification_requested_at: new Date().toISOString(),
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;
    if (whatsapp && whatsapp.trim()) updates.whatsapp = whatsapp.trim();
    return updateProfile(updates);
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const role = user ? profile?.role || 'ciudadano' : 'visitante';
  const roleInfo = ROLES_INFO[role] || ROLES_INFO.ciudadano;
  const isBanned = Boolean(profile?.is_banned);
  const hasCustomPhoto = hasCustomProfilePhoto(profile);

  // Permisos según las nuevas directivas de USUARIOS.md:
  // 1. Mapa: cualquier usuario registrado no baneado (Nivel 1 Ciudadano, Nivel 2, 3 o 4) puede aportar alertas
  const canWriteMap = Boolean(
    user &&
      !isBanned &&
      ['ciudadano', 'visitante', 'cadete_verificado', 'cadete_emprendedor', 'admin'].includes(role)
  );

  // 2. Herramientas exclusivas de Cadetes (Turnos, Avisos y Noticias): solo Nivel 2, 3 y 4
  const canUseCadeteTools = Boolean(
    user && !isBanned && ['cadete_verificado', 'cadete_emprendedor', 'admin'].includes(role)
  );

  // Compatibilidad con TurnosPage / Layout
  const canWriteMapAndShifts = canUseCadeteTools;

  // 3. Publicar ventas en Mulitas Emprendedoras:
  //    - Admin: requiere solo foto de perfil propia cargada (sin aprobación previa)
  //    - Emprendedor (Nivel 3): requiere foto de perfil propia cargada + aprobación del Admin
  const canPublishFeria = Boolean(
    user &&
      !isBanned &&
      hasCustomPhoto &&
      (role === 'admin' ||
        (role === 'cadete_emprendedor' && profile?.verification_status === 'approved'))
  );

  // Foto de perfil propia aprobada (requerida para publicar turnos y herramientas comunitarias)
  const hasApprovedPhoto = Boolean(
    user &&
      !isBanned &&
      hasCustomPhoto &&
      (role === 'admin' || profile?.verification_status === 'approved')
  );

  // 4. Moderador (Nivel 4): aprueba solicitudes, borra alertas y banea
  const isAdmin = Boolean(user && !isBanned && role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        roleInfo,
        loading,
        isBanned,
        hasCustomPhoto,
        hasApprovedPhoto,
        isSupabaseConfigured,
        canWriteMap,
        canUseCadeteTools,
        canWriteMapAndShifts,
        canPublishFeria,
        isAdmin,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        updateProfile,
        requestCadeteVerification,
        requestFeriaVerification,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
