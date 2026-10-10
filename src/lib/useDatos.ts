import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from './data'
import { calcularRacha, estadosPorDia, hoyEn, MINIMO_DIARIO, sumarDias, type Day, type Permitido } from './racha'

type Estado = {
  timezone: string
  /** Primer día que cuenta para la racha: el día en que se creó la cuenta. */
  desde: Day
  hoy: Day
  actividades: api.Actividad[]
  hechasHoy: Set<string>
  puntosPorDia: Record<Day, number>
  diasLibres: Day[]
  billetera: number
}

async function cargar(): Promise<Estado> {
  const perfil = await api.getPerfil()
  const hoy = hoyEn(perfil.timezone)
  const [actividades, completadas, puntosPorDia, diasLibres, billetera] = await Promise.all([
    api.getActividades(),
    api.getCompletadas(hoy),
    api.getPuntosPorDia(),
    api.getDiasLibres(),
    api.getBilletera(),
  ])
  return {
    timezone: perfil.timezone,
    desde: hoyEn(perfil.timezone, new Date(perfil.created_at)),
    hoy,
    actividades,
    hechasHoy: new Set(completadas.map((c) => c.activity_id)),
    puntosPorDia,
    diasLibres,
    billetera,
  }
}

/** Estado compartido por las cuatro pantallas. Los tildes se ven al instante y se confirman con Supabase. */
export function useDatos() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [error, setError] = useState<string | null>(null)

  const limpiarError = useCallback(() => setError(null), [])

  const recargar = useCallback(() => {
    cargar()
      .then(setEstado)
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    recargar()
    // Al volver a la app (por ejemplo, pasada la medianoche) se trae todo de nuevo.
    const onVisible = () => document.visibilityState === 'visible' && recargar()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [recargar])

  const derivado = useMemo(() => {
    if (!estado) return null
    const entrada = { puntosPorDia: estado.puntosPorDia, diasLibres: estado.diasLibres, desde: estado.desde, hoy: estado.hoy }
    const calendario = estadosPorDia(entrada)
    const racha = calcularRacha(entrada)
    // Si la racha se cortó justo ayer, la apertura muestra cómo se apaga desde el número que tenía.
    const ayer = calcularRacha({ ...entrada, hoy: sumarDias(estado.hoy, -1) })
    return {
      racha,
      rachaPerdida: racha.estado === 'apagado' && ayer.estado === 'azul' ? ayer.dias : 0,
      calendario,
      // Para no mostrar a Tito dormido a alguien que recién empieza.
      seEncendioAlgunaVez: Object.values(calendario).some((e) => e !== 'apagado' && e !== 'libre'),
    }
  }, [estado])

  /** Tilda o destilda una actividad de hoy. Devuelve true si cruzó los 2000. */
  const alternar = useCallback(
    async (id: string) => {
      if (!estado) return false
      const act = estado.actividades.find((a) => a.id === id)
      if (!act) return false
      const tildar = !estado.hechasHoy.has(id)
      const delta = tildar ? act.points : -act.points
      const antes = estado.puntosPorDia[estado.hoy] ?? 0

      setEstado((s) => {
        if (!s) return s
        const hechasHoy = new Set(s.hechasHoy)
        if (tildar) hechasHoy.add(id)
        else hechasHoy.delete(id)
        return {
          ...s,
          hechasHoy,
          puntosPorDia: { ...s.puntosPorDia, [s.hoy]: (s.puntosPorDia[s.hoy] ?? 0) + delta },
          billetera: s.billetera + delta,
        }
      })
      try {
        if (tildar) await api.tildar(id)
        else await api.destildar(id, estado.hoy)
      } catch (e) {
        setError((e as Error).message)
        recargar()
        return false
      }
      return antes < MINIMO_DIARIO && antes + delta >= MINIMO_DIARIO
    },
    [estado, recargar],
  )

  const canjear = useCallback(
    async (p: Permitido) => {
      try {
        const billetera = await api.canjear(p)
        setEstado((s) => (s ? { ...s, billetera } : s))
        return true
      } catch (e) {
        setError((e as Error).message)
        return false
      }
    },
    [],
  )

  const alternarDiaLibre = useCallback(
    async (day: Day) => {
      if (!estado) return
      try {
        if (estado.diasLibres.includes(day)) await api.quitarDiaLibre(day)
        else await api.elegirDiaLibre(day)
        setEstado((s) =>
          s
            ? {
                ...s,
                diasLibres: s.diasLibres.includes(day) ? s.diasLibres.filter((d) => d !== day) : [...s.diasLibres, day],
              }
            : s,
        )
      } catch (e) {
        const msg = (e as Error).message
        setError(msg.includes('unique') || msg.includes('duplicate') ? 'Ya elegiste un día libre esta semana' : msg)
      }
    },
    [estado],
  )

  return {
    estado,
    derivado,
    error,
    limpiarError,
    alternar,
    canjear,
    alternarDiaLibre,
  }
}

export type Datos = ReturnType<typeof useDatos>
