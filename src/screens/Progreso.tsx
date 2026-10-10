import { useState } from 'react'
import { DiaDetalle } from '../components/DiaDetalle'
import { formatoDia, inicioDeSemana, MINIMO_DIARIO, sumarDias, type Day } from '../lib/racha'
import type { Datos } from '../lib/useDatos'

type Vista = 'semana' | 'mes'

const W = 340
const H = 200
const PAD = { l: 34, r: 10, t: 12, b: 24 }
const MAX = 3000
const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function diasDelPeriodo(hoy: Day, vista: Vista, offset: number): Day[] {
  if (vista === 'semana') {
    const lunes = sumarDias(inicioDeSemana(hoy), offset * 7)
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  }
  const d = new Date(`${hoy.slice(0, 7)}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + offset)
  const primero = d.toISOString().slice(0, 10)
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  return Array.from({ length: d.getUTCDate() }, (_, i) => sumarDias(primero, i))
}

function titulo(dias: Day[], vista: Vista) {
  return vista === 'mes'
    ? formatoDia(dias[0], { month: 'long', year: 'numeric' })
    : `${formatoDia(dias[0], { day: 'numeric', month: 'short' })} al ${formatoDia(dias[6], { day: 'numeric', month: 'short' })}`
}

export function Progreso({ datos }: { datos: Datos }) {
  const { estado, derivado } = datos
  const [vista, setVista] = useState<Vista>('semana')
  const [offset, setOffset] = useState(0)
  const [elegido, setElegido] = useState<Day | null>(null)
  if (!estado || !derivado) return null

  const dias = diasDelPeriodo(estado.hoy, vista, offset)
  const pasados = dias.filter((d) => d <= estado.hoy)
  const total = pasados.reduce((s, d) => s + (estado.puntosPorDia[d] ?? 0), 0)

  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (dias.length - 1)
  const y = (p: number) => PAD.t + (1 - Math.min(p, MAX) / MAX) * (H - PAD.t - PAD.b)
  const puntos = pasados.map((d) => ({ d, i: dias.indexOf(d), p: estado.puntosPorDia[d] ?? 0 }))
  const linea = puntos.map(({ i, p }, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(' ')

  const cambiarVista = (v: Vista) => {
    setVista(v)
    setOffset(0)
    setElegido(null)
  }
  const mover = (n: number) => {
    setOffset(offset + n)
    setElegido(null)
  }

  return (
    <div className="progreso">
      <h1>Progreso</h1>
      <div className="segmentos" role="tablist">
        {(['semana', 'mes'] as Vista[]).map((v) => (
          <button key={v} role="tab" aria-selected={vista === v} className="hundir" onClick={() => cambiarVista(v)}>
            {v === 'semana' ? 'Semanal' : 'Mensual'}
          </button>
        ))}
      </div>

      <div className="tarjeta">
        <div className="periodo">
          <button className="flecha hundir" onClick={() => mover(-1)} aria-label="Anterior">
            ‹
          </button>
          <span>{titulo(dias, vista)}</span>
          <button className="flecha hundir" onClick={() => mover(1)} disabled={offset >= 0} aria-label="Siguiente">
            ›
          </button>
        </div>
        <div className="resumen">
          <div>
            <span className="grande">{total.toLocaleString('es-AR')}</span> <small>pts en el período</small>
          </div>
          <span className={`chip-racha ${derivado.racha.estado}`}>🔥 {derivado.racha.dias}</span>
        </div>

        <svg className="grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Puntos por día">
          {[0, 1000, 3000].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="guia" />
              <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="eje">
                {v}
              </text>
            </g>
          ))}
          {/* Línea mínima de 2000: punteada celeste, con fueguito azul y sin marcadores (doc 01). */}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(MINIMO_DIARIO)} y2={y(MINIMO_DIARIO)} className="minimo" />
          <path
            transform={`translate(${PAD.l - 24} ${y(MINIMO_DIARIO) - 9}) scale(0.4)`}
            d="M20 2c3 8 14 12 14 25a14 14 0 0 1-28 0c0-7 4-10 6-14 1 4 3 5 4 5-1-6 1-12 4-16z"
            fill="#3b6cf0"
          />
          {dias.map((d, i) =>
            vista === 'semana' || i === 0 || (i + 1) % 5 === 0 ? (
              <text key={d} x={x(i)} y={H - 6} textAnchor="middle" className={`eje${d === estado.hoy ? ' hoy' : ''}`}>
                {vista === 'semana' ? LETRAS[i] : i + 1}
              </text>
            ) : null,
          )}
          {/* Redibujar: la key cambia con la vista y el período, así la línea se dibuja de nuevo. */}
          <g key={`${vista}${offset}`}>
            {linea && <path d={linea} pathLength={1} className="linea" />}
            {puntos.map(({ d, i, p }, k) => {
              const sel = elegido === d
              return (
                <g
                  key={d}
                  onClick={() => setElegido(d)}
                  className={`punto${sel ? ' sel' : ''}`}
                  // Los puntos aparecen cuando la línea pasa por ellos.
                  style={{ animationDelay: `${(k / Math.max(1, puntos.length - 1)) * 0.8}s` }}
                >
                  {sel && <line x1={x(i)} x2={x(i)} y1={y(p)} y2={H - PAD.b} className="guia-punto" />}
                  <circle cx={x(i)} cy={y(p)} r={14} fill="transparent" />
                  {sel && <circle cx={x(i)} cy={y(p)} r={13} className="aro-punto" />}
                  <circle cx={x(i)} cy={y(p)} r={5} className={`dot ${p >= MINIMO_DIARIO ? 'hi' : 'lo'}`} />
                </g>
              )
            })}
          </g>
        </svg>
        <p className="nota">Tocá un punto para ver el día.</p>
      </div>

      {elegido && (
        <DiaDetalle key={elegido} day={elegido} actividades={estado.actividades} libre={estado.diasLibres.includes(elegido)} />
      )}
    </div>
  )
}
