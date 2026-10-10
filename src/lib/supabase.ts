import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** null cuando faltan las variables de entorno (ver README). */
export const supabase: SupabaseClient<Database> | null = url && key ? createClient<Database>(url, key) : null

// Lectura de Google Calendar para la v1 (doc 01). La escritura queda para la fase 2.
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

export async function signInWithGoogle() {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: GOOGLE_SCOPES,
    },
  })
  if (error) throw error
}

export async function signOut() {
  await supabase?.auth.signOut()
}
