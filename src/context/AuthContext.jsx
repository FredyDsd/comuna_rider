import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export const ROLES_INFO = {
  visitante: {
    level: 1,
    code: 'visitante',
    name: 'Visitante / Novato',
    badge: 'Nivel 1 • Solo Lectura',
    description:
      'Puede ver el Mapa de Alertas, el Tablón de Turnos y usar la Calculadora. No puede agregar pines, turnos ni ventas.',
  },
  cadete_verificado: {
    level: 2,
    code: 'cadete_verificado',
    name: 'Cadete Verificado',
    badge: 'Nivel 2 • Cadete Verificado',
    description:
      'Habilitado para colocar Pines de Alerta en el mapa y publicar/tomar turnos en el tablón (vinculado a su ID).',
  },
  cadete_emprendedor: {
    level: 3,
    code: 'cadete_emprendedor',
    name: 'Cadete Emprendedor / Vendedor',
    badge: 'Nivel 3 • Vendedor Confiable',
    description:
      'Todo lo del Nivel 2 + habilitado para publicar ventas en el Mercado Cadete con distintivo de Vendedor Confiable.',
  },
  admin: {
    level: 4,
    code: 'admin',
    name: 'Administrador',
    badge: 'Nivel 4 • Administrador',
    description:
      'Dueño del sistema. Puede borrar alertas falsas, moderar el tablón de turnos, el mercado y gestionar usuarios.',
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
          'Cadete Jujuy',
        role: extraMeta.role || authUser.user_metadata?.role || 'cadete_verificado',
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

  const signUpWithEmail = async ({ email, password, fullName, vehicle = 'Moto', zone = 'Centro' }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY primero.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'cadete_verificado',
          vehicle,
          zone,
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      await ensureProfile(data.user, {
        full_name: fullName,
        role: 'cadete_verificado',
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
          full_name: profile?.full_name || user.email?.split('@')[0] || 'Cadete Jujuy',
          role: profile?.role || 'cadete_verificado',
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

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const role = user ? profile?.role || 'cadete_verificado' : 'visitante';
  const roleInfo = ROLES_INFO[role] || ROLES_INFO.visitante;
  const isBanned = Boolean(profile?.is_banned);

  // Permisos según USUARIOS.md
  const canWriteMapAndShifts = Boolean(
    user && !isBanned && ['cadete_verificado', 'cadete_emprendedor', 'admin'].includes(role)
  );
  const canPublishFeria = Boolean(
    user && !isBanned && ['cadete_emprendedor', 'admin'].includes(role)
  );
  const isAdmin = Boolean(user && !isBanned && role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        roleInfo,
        loading,
        isSupabaseConfigured,
        canWriteMapAndShifts,
        canPublishFeria,
        isAdmin,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        updateProfile,
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

