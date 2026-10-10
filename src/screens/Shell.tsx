import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { NavBar, type Section } from '../components/NavBar'
import { Tito } from '../components/Tito'
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
function Logo() {
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
    <button className="shell-logo" onClick={poke} aria-label="Tito">
      <Tito anim={anim} size={34} glow={false} />
    </button>
  )
}

export function Shell({ session }: { session: Session }) {
  const [section, setSection] = useState<Section>('hoy')
  const name = (session.user.user_metadata.full_name as string | undefined)?.split(' ')[0] ?? 'Tomi'
  const datos = useDatos()
  const { derivado, error, limpiarError } = datos

  useEffect(() => {
    if (!error) return
    const t = window.setTimeout(limpiarError, 4000)
    return () => window.clearTimeout(t)
  }, [error, limpiarError])

  return (
    <div className="shell">
      <header className="shell-header">
        <Logo />
        <div className="shell-right">
          {derivado && (
            <span className={`chip-racha ${derivado.racha.estado}`} aria-label={`Racha de ${derivado.racha.dias} días`}>
              🔥 {derivado.racha.dias}
            </span>
          )}
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
          <Hoy datos={datos} nombre={name} />
        ) : section === 'progreso' ? (
          <Progreso datos={datos} />
        ) : section === 'calendario' ? (
          <Calendario datos={datos} />
        ) : (
          <Permitidos datos={datos} />
        )}
      </main>

      {error && datos.estado && (
        <div className="aviso" role="alert" onClick={limpiarError}>
          {error}
        </div>
      )}

      <NavBar current={section} onChange={setSection} />
    </div>
  )
}
