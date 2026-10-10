import { useEffect, useState } from 'react'
import { getCompletadas, type Actividad, type Completada } from '../lib/data'
import { formatoDia, MINIMO_DIARIO, type Day } from '../lib/racha'
import { Tilde } from './Tilde'


type Props = {
  day: Day
  actividades: Actividad[]
  libre?: boolean
}

/** Detalle del día (Progreso y Calendario): total, estado y actividades con puntos (doc 02). */
export function DiaDetalle({ day, actividades, libre }: Props) {
  const [hechas, setHechas] = useState<Completada[] | null>(null)

  useEffect(() => {
    let vivo = true
    getCompletadas(day)
      .then((c) => vivo && setHechas(c))
      .catch(() => vivo && setHechas([]))
    return () => {
      vivo = false
    }
  }, [day])

  const tipo = (id: string) => actividades.find((a) => a.id === id)?.kind ?? 'principal'
  const orden = (id: string) => actividades.find((a) => a.id === id)?.sort ?? 99
  const total = hechas?.reduce((s, c) => s + c.points, 0) ?? 0
  const encendido = total >= MINIMO_DIARIO

  return (
    <section className="detalle screen" aria-live="polite">
      <header className="detalle-top">
        <h2>{formatoDia(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <span className="detalle-total">{hechas ? `${total} pts` : '…'}</span>
      </header>
      {hechas && (
        <p className={`detalle-estado ${encendido ? 'hi' : 'lo'}`}>
          {encendido ? 'Fuego encendido' : libre ? 'Día libre' : 'Bajo el mínimo'}
        </p>
      )}
      {hechas?.length === 0 && <p className="vacio">No hay actividades tildadas.</p>}
      <ul className="detalle-lista" key={hechas ? 'ok' : 'cargando'}>
        {hechas
          ?.toSorted((a, b) => orden(a.activity_id) - orden(b.activity_id))
          .map((c, n) => {
            const bonus = tipo(c.activity_id) === 'bonus'
            return (
              <li key={c.id}>
                <Tilde hecho gris={bonus} cascada={0.15 + n * 0.09} />
                <span className="nm">{c.activity_name}</span>
                {bonus && <span className="etiqueta">bonus</span>}
                <span className="p">{c.points}</span>
              </li>
            )
          })}
      </ul>
    </section>
  )
}
