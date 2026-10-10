// Avisos push (doc 01): pide permiso, suscribe este dispositivo y lo guarda en Supabase.
import { supabase } from './supabase'

export type EstadoAvisos = 'no-soportado' | 'bloqueado' | 'apagado' | 'activo'

export function soportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function claveABytes(base64: string) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!soportado()) return 'no-soportado'
  if (Notification.permission === 'denied') return 'bloqueado'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'activo' : 'apagado'
}

/** Pide permiso y guarda la suscripción. Tiene que llamarse desde un toque (iPhone lo exige). */
export async function activarAvisos(): Promise<EstadoAvisos> {
  if (!soportado() || !supabase) return 'no-soportado'
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueado' : 'apagado'
  // La clave pública VAPID la genera la función avisos y queda en Supabase (la privada nunca sale de ahí).
  const { data: vapid, error: errVapid } = await supabase.rpc('vapid_public_key')
  if (errVapid || !vapid) throw new Error('Los avisos todavía no están listos. Probá en unos minutos.')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(vapid) }))
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
  return 'activo'
}
