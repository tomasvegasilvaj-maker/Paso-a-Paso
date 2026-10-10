import { useEffect, useRef, useState } from 'react'
import { Tilde } from '../components/Tilde'
import { Tito, type TitoEstado } from '../components/Tito'
import { useTitoPoke } from '../components/useTitoPoke'
import { MINIMO_DIARIO } from '../lib/racha'
import { useContador } from '../lib/useContador'
import type { Datos } from '../lib/useDatos'

export function Hoy({ datos, nombre }: { datos: Datos; nombre: string }) {
  const { estado, derivado, alternar } = datos
  const { anim, poke, play } = useTitoPoke()
  const puntos = estado ? (estado.puntosPorDia[estado.hoy] ?? 0) : 0
  const mostrado = useContador(puntos)
  // "+50" que sube desde el chip recién tildado; el contador cambia la key para repetirlo.
  const [mas, setMas] = useState<{ id: string; n: number } | null>(null)

  // Tito cambia en el momento exacto en que el contador cruza 2000 (doc 03).
  const arriba = mostrado >= MINIMO_DIARIO
  const antes = useRef(arriba)
  useEffect(() => {
    if (arriba === antes.current) return
    antes.current = arriba
    play(arriba ? 'enojo' : 'bocanada', arriba ? 800 : 700)
  }, [arriba, play])

  if (!estado || !derivado) return null

  const { racha, seEncendioAlgunaVez } = derivado
  const encendido = puntos >= MINIMO_DIARIO
  const titoEstado: TitoEstado = arriba
    ? 'rojo'
    : racha.estado === 'azul'
      ? 'azul'
      : racha.estado === 'apagado' && seEncendioAlgunaVez
        ? 'apagado'
        : 'amarillo'

  const principales = estado.actividades.filter((a) => a.kind === 'principal')
  const bonus = estado.actividades.filter((a) => a.kind === 'bonus')

  const tocar = (id: string, esBonus = false) => {
    const tildando = !estado.hechasHoy.has(id)
    const cruza = tildando && puntos < MINIMO_DIARIO && puntos + (estado.actividades.find((a) => a.id === id)?.points ?? 0) >= MINIMO_DIARIO
    // Festeja al tildar, salvo que vaya a enojarse por cruzar 2000.
    if (tildando && !cruza) play(id === 'concentracion' ? 'gira' : 'salta', 950)
    if (tildando && esBonus) setMas({ id, n: (mas?.n ?? 0) + 1 })
    void alternar(id)
  }

  return (
    <div className="hoy">
      <h1 className="hoy-saludo">Hola, {nombre}</h1>

      <div className="hoy-tarjeta">
        <button className="hoy-tito" onClick={poke} aria-label="Tito">
          <Tito anim={anim} size={58} glow={false} estado={titoEstado} />
        </button>
        <div className="hoy-num">
          <p className="pts">
            {mostrado} <small>pts hoy</small>
          </p>
          <p className={`falta ${encendido ? 'hi' : 'lo'}`}>
            {encendido ? 'Fueguito encendido' : `Te faltan ${MINIMO_DIARIO - puntos} para el fueguito`}
          </p>
          <div className={`barra ${arriba ? 'hi' : ''}`}>
            <i style={{ width: `${Math.min(100, (mostrado / MINIMO_DIARIO) * 100)}%` }} />
          </div>
        </div>
      </div>

      <p className="sec">Principales</p>
      <div className="lista">
        {principales.map((a) => {
          const hecho = estado.hechasHoy.has(a.id)
          return (
            <button
              key={a.id}
              className={`act hundir${hecho ? ' hecho' : ''}`}
              aria-pressed={hecho}
              onClick={() => tocar(a.id)}
            >
              <Tilde hecho={hecho} />
              <span className="nm">{a.name}</span>
              <span className="p">{a.points}</span>
            </button>
          )
        })}
      </div>

      <p className="sec">Bonus</p>
      <div className="chips">
        {bonus.map((a) => {
          const hecho = estado.hechasHoy.has(a.id)
          return (
            <button
              key={a.id}
              className={`chip hundir${hecho ? ' hecho' : ''}`}
              aria-pressed={hecho}
              onClick={() => tocar(a.id, true)}
            >
              <span className="chip-fondo" />
              <span className="chip-txt">
                <svg className="chip-check" viewBox="0 0 12 12" aria-hidden="true">
                  <path pathLength={1} d="M2 6.5l2.5 2.5 5.5-6" />
                </svg>
                {a.name} · {a.points}
              </span>
              {mas?.id === a.id && hecho && (
                <span key={mas.n} className="mas" aria-hidden="true">
                  +{a.points}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="nota">Si te equivocaste, tocá de nuevo para destildar (solo hoy).</p>
    </div>
  )
}
