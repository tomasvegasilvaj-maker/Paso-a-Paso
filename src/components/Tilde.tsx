/** Casilla con tilde amarillo (gris para las bonus en el detalle del día). */
export function Tilde({ hecho, gris = false }: { hecho: boolean; gris?: boolean }) {
  return (
    <span className={`tilde${hecho ? ' hecho' : ''}${gris ? ' gris' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path pathLength={1} d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  )
}
