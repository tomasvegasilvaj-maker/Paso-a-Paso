import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { NavBar, type Section } from '../components/NavBar'
import { Tito } from '../components/Tito'
import { useTitoPoke } from '../components/useTitoPoke'
import { signOut } from '../lib/supabase'
import './Shell.css'

const TITLES: Record<Section, string> = {
  hoy: 'Hoy',
  progreso: 'Progreso',
  calendario: 'Calendario',
  permitidos: 'Permitidos',
}

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

  return (
    <div className="shell">
      <header className="shell-header">
        <Logo />
        <button className="shell-out hundir" onClick={signOut}>
          Salir
        </button>
      </header>

      {/* La key reinicia el fundido de 0,4 s en cada cambio de sección. */}
      <main key={section} className="shell-main screen">
        <h1>{section === 'hoy' ? `Hola, ${name}` : TITLES[section]}</h1>
        <p className="shell-soon">Esta pantalla se arma en los próximos pasos.</p>
      </main>

      <NavBar current={section} onChange={setSection} />
    </div>
  )
}
