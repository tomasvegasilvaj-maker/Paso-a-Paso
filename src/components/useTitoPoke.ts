import { useCallback, useEffect, useRef, useState } from 'react'
import type { TitoAnim } from './Tito'

const REACTIONS: TitoAnim[] = ['rie', 'saluda', 'guino', 'salta']

/** Elige una reacción al azar que no repita la anterior. */
export function useTitoPoke() {
  const [anim, setAnim] = useState<TitoAnim>('idle')
  const last = useRef<TitoAnim>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const busy = useRef(false)

  // Estable entre renders, así el logo puede programarla con un timer.
  const poke = useCallback(() => {
    if (busy.current) return
    const options = REACTIONS.filter((a) => a !== last.current)
    const next = options[Math.floor(Math.random() * options.length)]
    last.current = next
    busy.current = true
    setAnim(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      busy.current = false
      setAnim('idle')
    }, 1100)
  }, [])

  /** Reproduce una animación puntual (festejo, enojo, bocanada) aunque haya otra en curso. */
  const play = useCallback((a: TitoAnim, ms = 1000) => {
    busy.current = true
    setAnim('idle')
    // Un cuadro en idle para que la animación arranque de cero aunque se repita.
    requestAnimationFrame(() => setAnim(a))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      busy.current = false
      setAnim('idle')
    }, ms)
  }, [])

  return { anim, poke, play }
}
