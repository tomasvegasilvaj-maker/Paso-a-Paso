import { useEffect, useRef, useState } from 'react'
import { Tito, type TitoAnim, type TitoEstado } from './Tito'
import './Apertura.css'

type Props = {
  /** null mientras se cargan los datos. */
  estado: TitoEstado | null
  nombre: string
  /** El rayo llegó al logo: el logo reaparece con rebote. */
  onImpacto: () => void
  onFin: () => void
}

type Fase = 'show' | 'luz' | 'rayo' | 'impacto' | 'sale'

const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Zigzag tipo rayo entre dos puntos (4 tramos alternados). */
function zigzag(x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const pts: [number, number][] = [[x0, y0]]
  for (let i = 1; i < 4; i++) {
    const off = (i % 2 ? 1 : -1) * Math.min(42, len * 0.12)
    pts.push([x0 + (dx * i) / 4 + nx * off, y0 + (dy * i) / 4 + ny * off])
  }
  pts.push([x1, y1])
  return pts
}

/** Curva suave (apagado): flota despacio hasta el logo. */
function curva(x0: number, y0: number, x1: number, y1: number) {
  const cx = x0 + (x1 - x0) * 0.1
  const cy = y1 + (y0 - y1) * 0.2
  return Array.from({ length: 13 }, (_, i) => {
    const t = i / 12
    const u = 1 - t
    return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1] as [number, number]
  })
}

/**
 * Apertura de la app (doc 03): Tito saluda en el centro y viaja hasta el logo. Amarillo: rayo de 0,42 s.
 * Azul: preocupado, rayo azul de 0,6 s. Apagado: dormido sobre la leña, flota en curva 1,1 s.
 * Siempre termina en el logo amarillo. Se saltea tocando la pantalla.
 */
export function Apertura({ estado, nombre, onImpacto, onFin }: Props) {
  const [fase, setFase] = useState<Fase>('show')
  const [anim, setAnim] = useState<TitoAnim>('idle')
  const [globo, setGlobo] = useState<string | null>(null)
  const [busca, setBusca] = useState(false)
  const [ruta, setRuta] = useState<[number, number][] | null>(null)
  const [destino, setDestino] = useState<[number, number] | null>(null)
  const timers = useRef<number[]>([])
  const orbe = useRef<HTMLDivElement>(null)
  const titoRef = useRef<HTMLDivElement>(null)
  const terminado = useRef(false)
  const iniciado = useRef(false)
  const cb = useRef({ onImpacto, onFin })
  useEffect(() => {
    cb.current = { onImpacto, onFin }
  })

  const en = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms))

  const terminar = () => {
    if (terminado.current) return
    terminado.current = true
    timers.current.forEach(clearTimeout)
    cb.current.onImpacto()
    setFase('sale')
    window.setTimeout(() => cb.current.onFin(), 400)
  }

  // Si la carga tarda más de 0,5 s aparece un Tito chiquito que respira ("Busca").
  useEffect(() => {
    const t = window.setTimeout(() => setBusca(true), 500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!estado || iniciado.current) return
    iniciado.current = true
    const tipo = estado === 'rojo' ? 'amarillo' : estado
    if (reducido()) {
      en(900, terminar)
      return
    }
    let t = 500
    if (tipo === 'amarillo') {
      en(t, () => setAnim('rie'))
      en((t += 900), () => {
        setAnim('saluda')
        setGlobo(`¡Hola, ${nombre}!`)
      })
      en((t += 1100), () => setAnim('salta'))
      t += 800
    } else if (tipo === 'azul') {
      en(t, () => {
        setAnim('tiembla')
        setGlobo('Hoy me rescatás, ¿no?')
      })
      t += 1800
    } else {
      t += 1600
    }
    en(t, () => {
      setGlobo(null)
      setAnim('idle')
      const logo = document.querySelector('.shell-logo')?.getBoundingClientRect()
      const tito = titoRef.current?.getBoundingClientRect()
      if (!logo || !tito) return terminar()
      const x0 = tito.left + tito.width / 2
      const y0 = tito.top + tito.height / 2
      const x1 = logo.left + logo.width / 2
      const y1 = logo.top + logo.height / 2
      setDestino([x1, y1])
      if (tipo === 'apagado') {
        // Tito mismo flota en curva hasta el logo y se achica.
        const pts = curva(x0, y0, x1, y1)
        setFase('rayo')
        titoRef.current?.animate(
          pts.map(([x, y], i) => ({
            transform: `translate(${x - x0}px, ${y - y0}px) scale(${1 - (0.75 * i) / (pts.length - 1)})`,
            opacity: i === pts.length - 1 ? 0.2 : 1,
          })),
          { duration: 1100, easing: 'ease-in-out', fill: 'forwards' },
        )
        en(1100, () => setFase('impacto'))
      } else {
        const dur = tipo === 'azul' ? 600 : 420
        setFase('luz')
        en(220, () => {
          const pts = zigzag(x0, y0, x1, y1)
          setRuta(pts)
          setFase('rayo')
          const largos = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
          const total = largos.reduce((a, b) => a + b, 0)
          let acc = 0
          orbe.current?.animate(
            pts.map(([x, y], i) => {
              if (i > 0) acc += largos[i - 1]
              return { transform: `translate(${x}px, ${y}px)`, offset: acc / total }
            }),
            { duration: dur, easing: 'ease-in', fill: 'forwards' },
          )
          en(dur, () => setFase('impacto'))
        })
      }
      en(tipo === 'apagado' ? 1100 : 220 + (tipo === 'azul' ? 600 : 420), () => {
        cb.current.onImpacto()
        en(380, terminar)
      })
    })
    // Los timers se limpian en terminar(); este efecto corre una sola vez cuando hay datos.
  }, [estado, nombre])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const tipo = estado === 'rojo' ? 'amarillo' : (estado ?? 'amarillo')
  const color = tipo === 'azul' ? '#5b8cff' : '#ffd23f'
  const rayoDur = tipo === 'azul' ? 0.6 : 0.42

  return (
    <div className={`apertura fase-${fase} tipo-${tipo}`} onClick={terminar} role="presentation">
      {!estado && busca && (
        <div className="ap-busca">
          <Tito anim="idle" size={56} glow={false} />
        </div>
      )}
      {estado && (
        <div className="ap-centro">
          {globo && <p className="ap-globo">{globo}</p>}
          <div ref={titoRef} className="ap-tito">
            <Tito anim={anim} size={tipo === 'apagado' ? 130 : 150} estado={tipo} />
            {tipo === 'apagado' && (
              <svg className="ap-lena" viewBox="0 0 120 30" aria-hidden="true">
                <rect x="10" y="8" width="100" height="12" rx="6" fill="#6b4a2e" transform="rotate(-8 60 14)" />
                <rect x="10" y="10" width="100" height="12" rx="6" fill="#7d5636" transform="rotate(8 60 16)" />
              </svg>
            )}
          </div>
        </div>
      )}
      {ruta && (
        <svg className="ap-rayo" aria-hidden="true">
          <polyline
            points={ruta.map((p) => p.join(',')).join(' ')}
            pathLength={1}
            stroke={color}
            style={{ animationDuration: `${rayoDur}s` }}
          />
        </svg>
      )}
      <div ref={orbe} className="ap-orbe" style={{ background: color, boxShadow: `0 0 24px 8px ${color}` }} />
      {destino && (fase === 'impacto' || fase === 'sale') && (
        <span className="ap-aro" style={{ left: destino[0], top: destino[1], borderColor: color }} />
      )}
    </div>
  )
}
