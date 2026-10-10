import { useEffect, useState } from 'react'
import { esHito, type EstadoFuego } from '../lib/racha'
import './ChipRacha.css'

type Props = {
  dias: number
  estado: EstadoFuego
  /** Reproduce "se apaga" (la llama parpadea, se achica y larga la bocanada). */
  apagando?: boolean
}

/**
 * Chip de racha (doc 03): el número gira tipo cuentakilómetros, la llama se aviva al sumar,
 * en un hito se estira con "· ¡hito!", y al reencenderse salta una chispa sobre la leña.
 */
export function ChipRacha({ dias, estado, apagando = false }: Props) {
  const [prev, setPrev] = useState(dias)
  const [giro, setGiro] = useState<{ de: number; a: number; k: number } | null>(null)
  const [hito, setHito] = useState(false)
  const [chispa, setChispa] = useState(0)

  // Patrón de React para reaccionar a un cambio de prop durante el render.
  if (dias !== prev) {
    setGiro({ de: prev, a: dias, k: (giro?.k ?? 0) + 1 })
    if (dias > prev && esHito(dias)) setHito(true)
    if (prev === 0 && dias > 0) setChispa((c) => c + 1)
    setPrev(dias)
  }

  useEffect(() => {
    if (!hito) return
    const t = window.setTimeout(() => setHito(false), 2600)
    return () => window.clearTimeout(t)
  }, [hito])

  const sube = giro ? giro.a > giro.de : false

  return (
    <span
      className={`chip-racha ${estado}${hito ? ' hito' : ''}${apagando ? ' apagando' : ''}`}
      aria-label={`Racha de ${dias} días`}
    >
      <span className="cr-llama-box">
        <span key={giro && sube ? `l${giro.k}` : 'l'} className={`cr-llama${giro && sube ? ' aviva' : ''}`}>
          🔥
        </span>
        {chispa > 0 && <span key={chispa} className="cr-chispa" aria-hidden="true" />}
        <span className="cr-humo" aria-hidden="true" />
      </span>
      <span className="cr-num">
        {giro ? (
          <span key={giro.k} className={`cr-odo ${sube ? 'sube' : 'baja'}`} onAnimationEnd={() => setGiro(null)}>
            <span>{sube ? giro.de : giro.a}</span>
            <span>{sube ? giro.a : giro.de}</span>
          </span>
        ) : (
          dias
        )}
      </span>
      {hito && <span className="cr-hito">días · ¡hito!</span>}
    </span>
  )
}
