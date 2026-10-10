// Acceso a los datos de Supabase. Las reglas de la racha están en racha.ts.
import { supabase } from './supabase'
import type { Tables } from './database.types'
import { calcularRacha, estadosPorDia, hoyEn, type Day, type Permitido } from './racha'

export type Actividad = Tables<'activities'>
export type Completada = Tables<'completions'>

function db() {
  if (!supabase) throw new Error('Falta configurar Supabase (ver README)')
  return supabase
}

export async function getPerfil() {
  const { data, error } = await db().from('profiles').select('timezone, created_at').single()
  if (error) throw error
  return data
}

/** Catálogo ordenado como en la pantalla Hoy (principales y después bonus). */
export async function getActividades(): Promise<Actividad[]> {
  const { data, error } = await db().from('activities').select('*').eq('active', true).order('sort')
  if (error) throw error
  return data
}

export async function getCompletadas(day: Day): Promise<Completada[]> {
  const { data, error } = await db().from('completions').select('*').eq('day', day)
  if (error) throw error
  return data
}

/** Tilda una actividad. El servidor pone el día, el nombre y los puntos. */
export async function tildar(activityId: string) {
  const { error } = await db()
    .from('completions')
    .insert({ activity_id: activityId, activity_name: '', points: 0, day: '1970-01-01' })
  if (error) throw error
}

/** Destilda una actividad de hoy (la base no deja tocar días pasados). */
export async function destildar(activityId: string, hoy: Day) {
  const { error } = await db().from('completions').delete().eq('activity_id', activityId).eq('day', hoy)
  if (error) throw error
}

export async function getBilletera(): Promise<number> {
  const { data, error } = await db().rpc('wallet_balance')
  if (error) throw error
  return data
}

/** Canjea un permitido. Devuelve la billetera nueva o tira "Te faltan N pts". */
export async function canjear(permitido: Permitido): Promise<number> {
  const { data, error } = await db().rpc('redeem', { p_kind: permitido })
  if (error) throw new Error(error.message)
  return data
}

export async function getDiasLibres(): Promise<Day[]> {
  const { data, error } = await db().from('free_days').select('day')
  if (error) throw error
  return data.map((d) => d.day)
}

/** Elige el día libre de esa semana (sábado o domingo, hoy o más adelante). */
export async function elegirDiaLibre(day: Day) {
  const { error } = await db().from('free_days').insert({ day })
  if (error) throw error
}

export async function quitarDiaLibre(day: Day) {
  const { error } = await db().from('free_days').delete().eq('day', day)
  if (error) throw error
}

export async function getPuntosPorDia(): Promise<Record<Day, number>> {
  const { data, error } = await db().from('daily_points').select('day, points')
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.day ?? '', r.points ?? 0]))
}

/** Todo lo que necesita el fueguito y el calendario en una sola carga. */
export async function getResumen() {
  const [perfil, puntosPorDia, diasLibres] = await Promise.all([getPerfil(), getPuntosPorDia(), getDiasLibres()])
  const hoy = hoyEn(perfil.timezone)
  const desde = hoyEn(perfil.timezone, new Date(perfil.created_at))
  const entrada = { puntosPorDia, diasLibres, desde, hoy }
  return { hoy, racha: calcularRacha(entrada), calendario: estadosPorDia(entrada), puntosPorDia }
}
