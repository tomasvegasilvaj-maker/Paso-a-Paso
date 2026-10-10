import { useEffect, useRef, useState } from 'react'
import { Tilde } from '../components/Tilde'
import { Tito, type TitoEstado } from '../components/Tito'
import { useTitoPoke } from '../components/useTitoPoke'
import { MINIMO_DIARIO } from '../lib/racha'
import type { Datos } from '../lib/useDatos'

/** Número que sube o baja contando en 1 s (doc 03). */
function useContador(valor: number) {
  const [mostrado, setMostrado] = useState(valor)
  const desde = useRef(valor)
  useEffect(() => {
    const inicio = desde.current
    const t0 = performance.now()
    let raf = 0
    const paso = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000)
      const v = Math.round(inicio + (valor - inicio) * (1 - (1 - k) ** 3))
      desde.current = v
      setMostrado(v)
      if (k < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [valor])
  return mostrado
}

export function Hoy({ datos, nombre }: { datos: Datos; nombre: string }) {
  const { estado, derivado, alternar } = datos
  const { anim, poke } = useTitoPoke()
  const puntos = estado ? (estado.puntosPorDia[estado.hoy] ?? 0) : 0
  const mostrado = useContador(puntos)
  if (!estado || !derivado) return null

  const { racha, seEncendioAlgunaVez } = derivado
  const encendido = puntos >= MINIMO_DIARIO
  const titoEstado: TitoEstado = encendido
    ? 'rojo'
    : racha.estado === 'azul'
      ? 'azul'
      : racha.estado === 'apagado' && seEncendioAlgunaVez
        ? 'apagado'
        : 'amarillo'

  const principales = estado.actividades.filter((a) => a.kind === 'principal')
  const bonus = estado.actividades.filter((a) => a.kind === 'bonus')

  const tocar = async (id: string) => {
    const tildando = !estado.hechasHoy.has(id)
    if (tildando) poke()
    await alternar(id)
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
          <div className={`barra ${encendido ? 'hi' : ''}`}>
            <i style={{ width: `${Math.min(100, (puntos / MINIMO_DIARIO) * 100)}%` }} />
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
              onClick={() => tocar(a.id)}
            >
              <span>
                {a.name} · {a.points}
              </span>
            </button>
          )
        })}
      </div>
      <p className="nota">Si te equivocaste, tocá de nuevo para destildar (solo hoy).</p>
    </div>
  )
}
