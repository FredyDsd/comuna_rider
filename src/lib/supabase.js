// Fase 2: Configurar credenciales reales de Supabase
// Obtener URL y anon key desde: https://app.supabase.com → Settings → API

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
