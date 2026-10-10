import { useEffect, useState } from 'react'
import { Tito } from '../components/Tito'
import { faltaParaPermitido, PERMITIDOS, type Permitido } from '../lib/racha'
import type { Datos } from '../lib/useDatos'

const NOMBRES: Record<Permitido, string> = { chico: 'Permitido chico', grande: 'Permitido grande' }

export function Permitidos({ datos }: { datos: Datos }) {
  const { estado, canjear } = datos
  // Primer toque pide confirmar, el segundo canjea: un toque sin querer no se puede deshacer.
  const [confirmando, setConfirmando] = useState<Permitido | null>(null)
  const [canjeado, setCanjeado] = useState<Permitido | null>(null)

  useEffect(() => {
    if (!confirmando) return
    const t = window.setTimeout(() => setConfirmando(null), 3500)
    return () => window.clearTimeout(t)
  }, [confirmando])

  useEffect(() => {
    if (!canjeado) return
    const t = window.setTimeout(() => setCanjeado(null), 2600)
    return () => window.clearTimeout(t)
  }, [canjeado])

  if (!estado) return null
  const billetera = estado.billetera

  const tocar = async (p: Permitido) => {
    if (confirmando !== p) return setConfirmando(p)
    setConfirmando(null)
    if (await canjear(p)) setCanjeado(p)
  }

  return (
    <div className="permitidos">
      <h1>Permitidos</h1>
      <div className="billetera">
        <span className="lbl">Billetera</span>
        <span className="billetera-num">{billetera.toLocaleString('es-AR')}</span>
        <span className="lbl">pts acumulados</span>
      </div>

      {(Object.keys(PERMITIDOS) as Permitido[]).map((p) => {
        const costo = PERMITIDOS[p]
        const falta = faltaParaPermitido(billetera, p)
        return (
          <div className="permitido" key={p}>
            <div className="permitido-top">
              <b>{NOMBRES[p]}</b>
              <span className="costo">{costo.toLocaleString('es-AR')} pts</span>
            </div>
            <div className={`barra${falta === 0 ? ' hi' : ''}`}>
              <i style={{ width: `${Math.min(100, (billetera / costo) * 100)}%` }} />
            </div>
            {falta > 0 ? (
              <p className="falta lo">Te faltan {falta.toLocaleString('es-AR')}</p>
            ) : (
              <button className="canjear hundir" onClick={() => tocar(p)}>
                {confirmando === p ? `¿Seguro? Tocá de nuevo (−${costo.toLocaleString('es-AR')})` : 'Canjear'}
              </button>
            )}
          </div>
        )
      })}

      {canjeado && (
        <div className="canje-ok screen" role="status">
          <Tito anim="saluda" size={48} glow={false} />
          <span>¡Disfrutá tu {NOMBRES[canjeado].toLowerCase()}!</span>
        </div>
      )}
    </div>
  )
}
