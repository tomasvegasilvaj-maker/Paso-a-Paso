import { useState, type CSSProperties } from 'react'
import { DiaDetalle } from '../components/DiaDetalle'
import { formatoDia, inicioDeSemana, sumarDias, type Day } from '../lib/racha'
import type { Datos } from '../lib/useDatos'

const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function grilla(mes: string): (Day | null)[] {
  const primero = `${mes}-01`
  const d = new Date(`${primero}T00:00:00Z`)
  const vacios = (d.getUTCDay() + 6) % 7
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  const dias = Array.from({ length: d.getUTCDate() }, (_, i) => sumarDias(primero, i))
  return [...Array<null>(vacios).fill(null), ...dias]
}

function moverMes(mes: string, n: number) {
  const d = new Date(`${mes}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 7)
}

export function Calendario({ datos }: { datos: Datos }) {
  const { estado, derivado, alternarDiaLibre } = datos
  const [mes, setMes] = useState<string | null>(null)
  const [elegido, setElegido] = useState<Day | null>(null)
  if (!estado || !derivado) return null

  const mesActual = mes ?? estado.hoy.slice(0, 7)
  const nombreMes = formatoDia(`${mesActual}-15`, { month: 'long', year: 'numeric' })
  const { calendario } = derivado
  const celdas = grilla(mesActual)
  const posElegido = elegido ? celdas.indexOf(elegido) : -1
  const libres = new Set(estado.diasLibres)
  const hoyLlego = (estado.puntosPorDia[estado.hoy] ?? 0) >= 2000

  const claseDe = (d: Day) => {
    if (d === estado.hoy) return hoyLlego ? 'rojo' : libres.has(d) ? 'libre' : ''
    if (d > estado.hoy) return libres.has(d) ? 'libre' : 'futuro'
    return calendario[d] ?? 'antes'
  }

  // Día libre: sábado o domingo, de hoy en adelante, uno por semana.
  const dow = elegido ? new Date(`${elegido}T00:00:00Z`).getUTCDay() : -1
  const puedeLibre = !!elegido && (dow === 0 || dow === 6) && elegido >= estado.hoy
  const otroLibreEnSemana =
    !!elegido &&
    estado.diasLibres.some((l) => l !== elegido && inicioDeSemana(l) === inicioDeSemana(elegido))

  return (
    <div className="calendario">
      <h1>Calendario</h1>
      <div className="tarjeta">
        <div className="periodo">
          <button className="flecha hundir" onClick={() => setMes(moverMes(mesActual, -1))} aria-label="Mes anterior">
            ‹
          </button>
          <span className="mes">{nombreMes}</span>
          <button className="flecha hundir" onClick={() => setMes(moverMes(mesActual, 1))} aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <div className="cal-grid">
          {SEMANA.map((l, i) => (
            <span key={i} className="cal-dow">
              {l}
            </span>
          ))}
        </div>
        {/* Cambio de mes con fundido: la key reinicia la animación. */}
        <div key={mesActual} className="cal-grid cal-dias screen">
          {celdas.map((d, i) =>
            d ? (
              <button
                key={d}
                className={`cal-dia hundir ${claseDe(d)}${d === estado.hoy ? ' hoy' : ''}`}
                aria-pressed={d === elegido}
                onClick={() => setElegido(d === elegido ? null : d)}
                aria-label={d}
              >
                {Number(d.slice(8))}
              </button>
            ) : (
              <span key={`v${i}`} />
            ),
          )}
          {/* Aro amarillo que se desliza del día anterior al nuevo. */}
          {posElegido >= 0 && (
            <span
              className="cal-aro"
              style={{ '--col': posElegido % 7, '--fila': Math.floor(posElegido / 7) } as CSSProperties}
            />
          )}
        </div>
        <div className="leyenda">
          <span>
            <i className="rojo" /> Encendido
          </span>
          <span>
            <i className="azul" /> Azul
          </span>
          <span>
            <i className="apagado" /> Apagado
          </span>
          <span>
            <i className="libre" /> Libre
          </span>
          <span>
            <i className="hoy" /> Hoy
          </span>
        </div>
      </div>

      {elegido && puedeLibre && (
        <button
          className="libre-btn hundir"
          disabled={otroLibreEnSemana}
          onClick={() => alternarDiaLibre(elegido)}
        >
          {libres.has(elegido)
            ? 'Quitar día libre'
            : otroLibreEnSemana
              ? 'Ya elegiste el día libre de esta semana'
              : 'Elegir como día libre'}
        </button>
      )}

      {elegido && elegido <= estado.hoy && (
        <DiaDetalle key={elegido} day={elegido} actividades={estado.actividades} libre={libres.has(elegido)} />
      )}
    </div>
  )
}
