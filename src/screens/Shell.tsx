import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Apertura } from '../components/Apertura'
import { BotonAvisos } from '../components/BotonAvisos'
import { ChipRacha } from '../components/ChipRacha'
import { NavBar, type Section } from '../components/NavBar'
import { Tito, type TitoEstado } from '../components/Tito'
import { useTitoPoke } from '../components/useTitoPoke'
import { signOut } from '../lib/supabase'
import { useDatos } from '../lib/useDatos'
import { Calendario } from './Calendario'
import { Hoy } from './Hoy'
import { Permitidos } from './Permitidos'
import { Progreso } from './Progreso'
import './Shell.css'
import './pantallas.css'

/** Logo de arriba a la izquierda: siempre amarillo; anima solo cada 10 a 15 s y al tocarlo (doc 02). */
function Logo({ visible }: { visible: boolean }) {
  const { anim, poke } = useTitoPoke()

  useEffect(() => {
    let t: number
    const schedule = () => {
      t = window.setTimeout(() => {
        poke()
        schedule()
      }, 10000 + Math.random() * 5000)
    }
    schedule()
    return () => window.clearTimeout(t)
  }, [poke])

  return (
    <button className={`shell-logo${visible ? ' llega' : ' oculto'}`} onClick={poke} aria-label="Tito">
      <Tito anim={anim} size={34} glow={false} />
    </button>
  )
}

export function Shell({ session }: { session: Session }) {
  // Los avisos abren la app con ?rescate=1 (22:15) o ?seccion=permitidos.
  const [params] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.size) window.history.replaceState(null, '', window.location.pathname)
    return p
  })
  const [section, setSection] = useState<Section>(params.get('seccion') === 'permitidos' ? 'permitidos' : 'hoy')
  const [mensaje, setMensaje] = useState<string | null>(null)
  useEffect(() => {
    if (!mensaje) return
    const t = window.setTimeout(() => setMensaje(null), 4000)
    return () => window.clearTimeout(t)
  }, [mensaje])
  const name = (session.user.user_metadata.full_name as string | undefined)?.split(' ')[0] ?? 'Tomi'
  const datos = useDatos()
  const { estado, derivado, error, limpiarError } = datos
  // Apertura: el logo aparece cuando llega el rayo; la racha apagada se anima después.
  const [apertura, setApertura] = useState(true)
  const [logoVisible, setLogoVisible] = useState(false)
  const [apagando, setApagando] = useState(false)

  let titoApertura: TitoEstado | null = null
  if (estado && derivado) {
    const { racha, seEncendioAlgunaVez } = derivado
    titoApertura =
      racha.estado === 'azul' ? 'azul' : racha.estado === 'apagado' && seEncendioAlgunaVez ? 'apagado' : 'amarillo'
  }

  const finApertura = () => {
    setApertura(false)
    if (derivado?.rachaPerdida) {
      setApagando(true)
      window.setTimeout(() => setApagando(false), 1000)
    }
  }

  useEffect(() => {
    if (!error) return
    const t = window.setTimeout(limpiarError, 4000)
    return () => window.clearTimeout(t)
  }, [error, limpiarError])

  return (
    <div className="shell">
      <header className="shell-header">
        <Logo visible={logoVisible} />
        <div className="shell-right">
          {derivado && (
            // Si la racha se cortó ayer, el chip arranca con su número, se apaga y baja girando a 0.
            <ChipRacha
              dias={derivado.rachaPerdida && (apertura || apagando) ? derivado.rachaPerdida : derivado.racha.dias}
              estado={derivado.rachaPerdida && (apertura || apagando) ? 'azul' : derivado.racha.estado}
              apagando={apagando}
            />
          )}
          <BotonAvisos onMensaje={setMensaje} />
          <button className="shell-out hundir" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>

      {/* La key reinicia el fundido de 0,4 s en cada cambio de sección. */}
      <main key={section} className="shell-main screen">
        {!datos.estado ? (
          <p className="shell-soon">{error ? `No se pudieron cargar los datos: ${error}` : 'Cargando…'}</p>
        ) : section === 'hoy' ? (
          <Hoy datos={datos} nombre={name} rescate={params.get('rescate') === '1'} />
        ) : section === 'progreso' ? (
          <Progreso datos={datos} />
        ) : section === 'calendario' ? (
          <Calendario datos={datos} />
        ) : (
          <Permitidos datos={datos} />
        )}
      </main>

      {mensaje && !error && (
        <div className="mensaje screen" role="status" onClick={() => setMensaje(null)}>
          {mensaje}
        </div>
      )}

      {error && datos.estado && (
        <div className="aviso" role="alert" onClick={limpiarError}>
          {error}
        </div>
      )}

      {apertura && !(error && !estado) && (
        <Apertura estado={titoApertura} nombre={name} onImpacto={() => setLogoVisible(true)} onFin={finApertura} />
      )}

      <NavBar current={section} onChange={setSection} />
    </div>
  )
}
