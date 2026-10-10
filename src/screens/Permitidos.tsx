import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { onda } from '../components/onda'
import { Tito } from '../components/Tito'
import { faltaParaPermitido, PERMITIDOS, type Permitido } from '../lib/racha'
import { useContador } from '../lib/useContador'
import type { Datos } from '../lib/useDatos'

const NOMBRES: Record<Permitido, string> = { chico: 'Permitido chico', grande: 'Permitido grande' }
const MONEDAS = 6
const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Permitidos({ datos }: { datos: Datos }) {
  const { estado, canjear } = datos
  const billetera = estado?.billetera ?? 0
  // La billetera baja contando en 1 s.
  const mostrada = useContador(billetera, 1000, 0)
  const [disfrutalo, setDisfrutalo] = useState<Permitido | null>(null)
  const [noAlcanza, setNoAlcanza] = useState<{ p: Permitido; k: number } | null>(null)
  const billeteraRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!disfrutalo) return
    const t = window.setTimeout(() => setDisfrutalo(null), 2200)
    return () => window.clearTimeout(t)
  }, [disfrutalo])

  useEffect(() => {
    if (!noAlcanza) return
    const t = window.setTimeout(() => setNoAlcanza(null), 1400)
    return () => window.clearTimeout(t)
  }, [noAlcanza])

  if (!estado) return null

  /** 6 monedas salen de la billetera hacia el botón; cada impacto lo engorda un poco. */
  const tirarMonedas = (boton: HTMLButtonElement) => {
    const desde = billeteraRef.current?.getBoundingClientRect()
    const hasta = boton.getBoundingClientRect()
    if (!desde || reducido()) return 0
    for (let i = 0; i < MONEDAS; i++) {
      const m = document.createElement('span')
      m.className = 'moneda'
      document.body.appendChild(m)
      const x0 = desde.left + desde.width / 2 + (i - 2.5) * 10
      const y0 = desde.top + desde.height / 2
      const x1 = hasta.left + hasta.width / 2 + (i - 2.5) * 6
      const y1 = hasta.top + 4
      const a = m.animate(
        [
          { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
          { transform: `translate(${x1}px, ${y1}px) scale(1)`, opacity: 1, offset: 0.85 },
          { transform: `translate(${x1}px, ${y1 + 14}px) scale(0.6)`, opacity: 0 },
        ],
        { duration: 340, delay: i * 90, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'both' },
      )
      a.onfinish = () => {
        m.remove()
        boton.animate([{ transform: `scale(${1 + (i + 1) * 0.01})` }], { duration: 90, fill: 'forwards' })
      }
    }
    const fin = (MONEDAS - 1) * 90 + 340
    window.setTimeout(() => {
      boton.animate([{ transform: `scale(${1 + MONEDAS * 0.01})` }, { transform: 'scale(0.97)' }, { transform: 'scale(1)' }], {
        duration: 380,
        easing: 'cubic-bezier(.3,1.4,.5,1)',
        fill: 'forwards',
      })
    }, fin + 40)
    return fin
  }

  const tocar = async (p: Permitido, e: MouseEvent<HTMLButtonElement>) => {
    if (faltaParaPermitido(billetera, p) > 0) {
      // No alcanza: sin Onda, tiembla junto con la barra y avisa cuánto falta.
      setNoAlcanza({ p, k: (noAlcanza?.k ?? 0) + 1 })
      return
    }
    onda(e)
    const boton = e.currentTarget
    const espera = tirarMonedas(boton)
    const ok = await canjear(p)
    if (ok) window.setTimeout(() => setDisfrutalo(p), espera)
  }

  return (
    <div className="permitidos">
      <h1>Permitidos</h1>
      <div className="billetera">
        <span className="lbl">Billetera</span>
        <span className="billetera-num" ref={billeteraRef}>
          {mostrada.toLocaleString('es-AR')}
        </span>
        <span className="lbl">pts acumulados</span>
      </div>

      {(Object.keys(PERMITIDOS) as Permitido[]).map((p) => {
        const costo = PERMITIDOS[p]
        const falta = faltaParaPermitido(billetera, p)
        const tiembla = noAlcanza?.p === p
        return (
          <div className="permitido" key={p}>
            <div className="permitido-top">
              <b>{NOMBRES[p]}</b>
              <span className="costo">{costo.toLocaleString('es-AR')} pts</span>
            </div>
            <div key={tiembla ? `t${noAlcanza.k}` : 'barra'} className={`barra${falta === 0 ? ' hi' : ''}${tiembla ? ' tiembla' : ''}`}>
              <i style={{ width: `${Math.min(100, (billetera / costo) * 100)}%` }} />
            </div>
            <button
              key={tiembla ? `b${noAlcanza.k}` : 'boton'}
              className={`canjear${falta > 0 ? ' apagado' : ''}${tiembla ? ' tiembla' : ''}`}
              onClick={(e) => tocar(p, e)}
            >
              {disfrutalo === p ? '¡Disfrutalo!' : tiembla ? `Te faltan ${falta.toLocaleString('es-AR')}` : 'Canjear'}
            </button>
            {falta > 0 && <p className="falta lo">Te faltan {falta.toLocaleString('es-AR')}</p>}
          </div>
        )
      })}

      {disfrutalo && (
        <div className="canje-ok screen" role="status">
          <Tito anim="saluda" size={48} glow={false} />
          <span>¡Disfrutá tu {NOMBRES[disfrutalo].toLowerCase()}!</span>
        </div>
      )}
    </div>
  )
}
