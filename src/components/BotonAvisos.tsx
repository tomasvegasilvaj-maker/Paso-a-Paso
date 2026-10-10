import { useEffect, useState } from 'react'
import { activarAvisos, estadoAvisos, type EstadoAvisos } from '../lib/avisos'

const TEXTO: Record<EstadoAvisos, string> = {
  'no-soportado': 'Este navegador no permite avisos. En iPhone, primero agregá la app a la pantalla de inicio.',
  bloqueado: 'Los avisos están bloqueados. Habilitalos en la configuración del navegador para este sitio.',
  apagado: 'Activar avisos de Tito',
  activo: 'Avisos activados',
}

/** Campanita del encabezado: amarilla cuando los avisos están apagados, para invitar a activarlos. */
export function BotonAvisos({ onMensaje }: { onMensaje: (m: string) => void }) {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null)

  useEffect(() => {
    let vivo = true
    estadoAvisos()
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado('no-soportado'))
    return () => {
      vivo = false
    }
  }, [])

  if (!estado) return null

  const tocar = async () => {
    if (estado !== 'apagado') return onMensaje(TEXTO[estado])
    try {
      const nuevo = await activarAvisos()
      setEstado(nuevo)
      onMensaje(nuevo === 'activo' ? '¡Listo! Tito te va a avisar.' : TEXTO[nuevo])
    } catch (e) {
      onMensaje(`No se pudieron activar: ${(e as Error).message}`)
    }
  }

  const on = estado === 'activo'
  return (
    <button className={`shell-bell hundir${estado === 'apagado' ? ' invita' : ''}`} onClick={tocar} aria-label={TEXTO[estado]} title={TEXTO[estado]}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
        <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
      </svg>
    </button>
  )
}
