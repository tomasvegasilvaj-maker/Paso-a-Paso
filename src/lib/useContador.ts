import { useEffect, useRef, useState } from 'react'

const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Número que sube o baja contando (doc 03: 1 s, arranca 0,15 s después del tilde). */
export function useContador(valor: number, duracion = 1000, demora = 150) {
  const [mostrado, setMostrado] = useState(valor)
  const actual = useRef(valor)
  useEffect(() => {
    const inicio = actual.current
    if (inicio === valor) return
    // Con "reducir movimiento" el número cambia de una.
    const quieto = reducido()
    const t0 = performance.now() + (quieto ? 0 : demora)
    let raf = 0
    const paso = (t: number) => {
      const k = quieto ? 1 : Math.max(0, Math.min(1, (t - t0) / duracion))
      const v = Math.round(inicio + (valor - inicio) * (1 - (1 - k) ** 3))
      actual.current = v
      setMostrado(v)
      if (k < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [valor, duracion, demora])
  return mostrado
}
