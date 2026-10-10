// Función "avisos": la llama pg_cron cada 5 minutos y manda los avisos push del doc 01
// según la hora de cada usuario. Tope de 3 por día (el de fueguito en peligro pasa igual).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { calcularRacha, hoyEn, MINIMO_DIARIO, PERMITIDOS, type Permitido } from './racha.ts'

type Aviso = { kind: string; title: string; body: string; url?: string }

const TOPE_DIARIO = 3
// Ventana para cada aviso con hora fija: desde la hora hasta 15 min después (el cron corre cada 5).
const VENTANA_MIN = 15

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

/** Minutos desde la medianoche en la zona horaria del usuario. */
function minutosDelDia(timeZone: string, ahora: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(ahora)
    .reduce<Record<string, string>>((o, x) => ({ ...o, [x.type]: x.value }), {})
  return Number(p.hour) * 60 + Number(p.minute)
}

const en = (min: number, h: number, m: number) => min >= h * 60 + m && min < h * 60 + m + VENTANA_MIN

async function avisosDe(userId: string, timezone: string, desde: string, ahora: Date): Promise<Aviso[]> {
  const hoy = hoyEn(timezone, ahora)
  const min = minutosDelDia(timezone, ahora)
  const [{ data: dias }, { data: libres }, { data: hechas }, { data: canjes }] = await Promise.all([
    db.from('daily_points').select('day, points').eq('user_id', userId),
    db.from('free_days').select('day').eq('user_id', userId),
    db.from('completions').select('activity_id, points, day').eq('user_id', userId).eq('day', hoy),
    db.from('redemptions').select('cost, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ])
  const puntosPorDia = Object.fromEntries((dias ?? []).map((d) => [d.day, d.points ?? 0]))
  const diasLibres = (libres ?? []).map((d) => d.day as string)
  const racha = calcularRacha({ puntosPorDia, diasLibres, desde, hoy })
  const puntosHoy = racha.puntosHoy
  const hecha = (id: string) => (hechas ?? []).some((c) => c.activity_id === id)
  const libreHoy = diasLibres.includes(hoy)
  const out: Aviso[] = []

  // Fueguito azul: a la mañana siguiente del día que no llegó.
  if (en(min, 8, 0) && racha.estado === 'azul' && puntosHoy < MINIMO_DIARIO) {
    out.push({ kind: 'azul', title: 'Tu fueguito está azul', body: 'Ayer no llegaste a 2000. Hoy lo rescatás, ¿no?' })
  }
  if (en(min, 8, 55) && !hecha('concentracion') && !libreHoy) {
    out.push({ kind: 'bloque', title: 'Arranca el bloque de concentración', body: 'En 5 minutos: 1000 pts te esperan.' })
  }
  if (en(min, 11, 30) && !hecha('cocinar') && !libreHoy) {
    out.push({ kind: 'cocinar', title: 'Hora de cocinar', body: 'Son 500 pts para el fueguito.' })
  }
  if (en(min, 22, 15) && puntosHoy < MINIMO_DIARIO && !libreHoy) {
    out.push({
      kind: 'peligro',
      title: 'Tu fueguito está en peligro',
      body: `Te faltan ${MINIMO_DIARIO - puntosHoy} pts. Tocá para rescatarlo.`,
      url: '?rescate=1',
    })
  }
  // Hito de racha: el día que se alcanza (3, 5, 10, 15…).
  if (racha.hitoHoy) {
    out.push({ kind: 'hito', title: `¡${racha.dias} días de racha!`, body: 'Tito está orgulloso. Seguí así.' })
  }
  // Permitido disponible: al llegar al costo, una vez por cada vez que se junta.
  const ganado = Object.values(puntosPorDia).reduce((a, b) => a + b, 0)
  const billetera = ganado - (canjes ?? []).reduce((a, c) => a + c.cost, 0)
  for (const p of Object.keys(PERMITIDOS) as Permitido[]) {
    if (billetera >= PERMITIDOS[p]) {
      out.push({
        kind: `permitido-${p}`,
        title: `Tenés un permitido ${p} disponible`,
        body: `Llevás ${billetera} pts en la billetera.`,
        url: '?seccion=permitidos',
      })
    }
  }
  return out
}

async function mandar(userId: string, hoy: string, aviso: Aviso) {
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  const payload = JSON.stringify({ title: aviso.title, body: aviso.body, url: aviso.url, tag: aviso.kind })
  let alguno = false
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      alguno = true
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      // El navegador dio de baja la suscripción: se borra.
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
      else console.error('push', status, (e as Error).message)
    }
  }
  if (alguno) await db.from('avisos_enviados').insert({ user_id: userId, day: hoy, kind: aviso.kind })
  return alguno
}

Deno.serve(async (req) => {
  // Claves en Vault (ver la migración avisos): el secreto del cron y el par VAPID.
  const { data: cfg, error: cfgError } = await db.rpc('avisos_config')
  if (cfgError || !cfg?.avisos_cron) return new Response('Falta configurar las claves', { status: 500 })
  if (req.headers.get('x-cron-secret') !== cfg.avisos_cron) {
    return new Response('no', { status: 401 })
  }
  // La primera vez se genera el par VAPID acá mismo, así la clave privada nunca sale de Supabase.
  if (!cfg.vapid_private) {
    const k = webpush.generateVAPIDKeys()
    const { error: e } = await db.rpc('avisos_guardar_vapid', { p_public: k.publicKey, p_private: k.privateKey })
    if (e) return new Response(e.message, { status: 500 })
    cfg.vapid_public = k.publicKey
    cfg.vapid_private = k.privateKey
  }
  webpush.setVapidDetails('https://tomasvegasilvaj-maker.github.io/Paso-a-Paso/', cfg.vapid_public, cfg.vapid_private)
  const ahora = new Date()
  const { data: perfiles, error } = await db.from('profiles').select('user_id, timezone, created_at')
  if (error) return new Response(error.message, { status: 500 })

  const enviados: string[] = []
  for (const p of perfiles ?? []) {
    const hoy = hoyEn(p.timezone, ahora)
    const desde = hoyEn(p.timezone, new Date(p.created_at))
    const { data: ya } = await db.from('avisos_enviados').select('kind').eq('user_id', p.user_id).eq('day', hoy)
    let cuenta = ya?.length ?? 0
    for (const a of await avisosDe(p.user_id, p.timezone, desde, ahora)) {
      if (ya?.some((x) => x.kind === a.kind)) continue
      if (a.kind.startsWith('permitido-') && (await yaAvisadoDesdeCanje(p.user_id, a.kind))) continue
      if (cuenta >= TOPE_DIARIO && a.kind !== 'peligro') continue
      if (await mandar(p.user_id, hoy, a)) {
        cuenta += 1
        enviados.push(`${p.user_id}:${a.kind}`)
      }
    }
  }
  return Response.json({ enviados })
})

/** Un permitido se avisa una vez y vuelve a avisarse recién después de un canje. */
async function yaAvisadoDesdeCanje(userId: string, kind: string) {
  const [{ data: ultimo }, { data: canje }] = await Promise.all([
    db.from('avisos_enviados').select('created_at').eq('user_id', userId).eq('kind', kind).order('created_at', { ascending: false }).limit(1),
    db.from('redemptions').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
  ])
  if (!ultimo?.length) return false
  return !canje?.length || ultimo[0].created_at > canje[0].created_at
}
