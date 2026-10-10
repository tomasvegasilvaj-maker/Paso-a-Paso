import type { CSSProperties } from 'react'

type Props = {
  hecho: boolean
  gris?: boolean
  /** Demora en segundos para dibujar los tildes en cascada (detalle del día). */
  cascada?: number
}

/**
 * Casilla con tilde (doc 03): al tildar se llena de amarillo y el tilde se dibuja en 0,6 s;
 * al destildar el amarillo se enrolla en diagonal hacia abajo a la izquierda.
 */
export function Tilde({ hecho, gris = false, cascada }: Props) {
  const style = cascada === undefined ? undefined : ({ '--cascada': `${cascada}s` } as CSSProperties)
  return (
    <span
      className={`tilde${hecho ? ' hecho' : ''}${gris ? ' gris' : ''}${cascada === undefined ? '' : ' cascada'}`}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16">
        <path pathLength={1} d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  )
}
