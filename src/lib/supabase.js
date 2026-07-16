import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local (copie de .env.example).',
  )
}

/**
 * Cliente único do Supabase (singleton). Nunca instancie outro em lugar nenhum.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(url, anonKey)
