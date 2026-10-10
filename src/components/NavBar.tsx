import { useState } from 'react'
import './NavBar.css'

export type Section = 'hoy' | 'progreso' | 'calendario' | 'permitidos'

const ITEMS: { id: Section; name: string; paths: string[] }[] = [
  {
    id: 'hoy',
    name: 'Hoy',
    paths: ['M5 12l-2 0l9 -9l9 9l-2 0', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7', 'M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6'],
  },
  { id: 'progreso', name: 'Progreso', paths: ['M4 19l16 0', 'M4 15l4 -6l4 2l4 -5l4 4'] },
  {
    id: 'calendario',
    name: 'Calendario',
    paths: [
      'M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z',
      'M16 3v4',
      'M8 3v4',
      'M4 11h16',
    ],
  },
  {
    id: 'permitidos',
    name: 'Permitidos',
    paths: [
      'M4 8h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1z',
      'M12 8l0 13',
      'M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7',
      'M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5',
    ],
  },
]

type Props = {
  current: Section
  onChange: (s: Section) => void
}

/**
 * Barra inferior "elástica" (doc 03): la burbuja estira primero el borde delantero y el
 * trasero 0,14 s después (0,32 s cada uno); el ícono nuevo aparece en amarillo al llegar.
 */
export function NavBar({ current, onChange }: Props) {
  const [prev, setPrev] = useState(current)
  const [moved, setMoved] = useState(false)

  const c = ITEMS.findIndex((i) => i.id === current)
  const p = ITEMS.findIndex((i) => i.id === prev)
  const right = c > p
  const ease = '.32s cubic-bezier(.4,0,.2,1)'
  const transition = moved ? `left ${ease} ${right ? '.14s' : '0s'}, right ${ease} ${right ? '0s' : '.14s'}` : 'none'

  return (
    <nav className="navbar" aria-label="Secciones">
      <div className="navbar-track">
        <div className="navbar-bubble" style={{ left: `${c * 25}%`, right: `${(3 - c) * 25}%`, transition }} />
        {ITEMS.map((item) => {
          const on = item.id === current
          return (
            <button
              key={item.id}
              className={`navbar-btn hundir${on ? (moved ? ' on' : ' on first') : ''}`}
              aria-label={item.name}
              aria-current={on ? 'page' : undefined}
              onClick={() => {
                if (on) return
                setPrev(current)
                setMoved(true)
                onChange(item.id)
              }}
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke={on ? 'var(--tito)' : 'var(--text-3)'}
                strokeWidth={on ? 2.6 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {item.paths.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
