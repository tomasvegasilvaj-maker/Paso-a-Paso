// Reglas de la racha y los permitidos (doc 01 "Producto y reglas").
// Funciones puras: no tocan la red ni la fecha del sistema, así se pueden testear y usar offline.

/** Fecha sin hora, 'YYYY-MM-DD', en la zona horaria del usuario. */
export type Day = string

export const MINIMO_DIARIO = 2000
export const PERMITIDOS = { chico: 5250, grande: 8500 } as const
export type Permitido = keyof typeof PERMITIDOS

/** rojo = encendido, azul = tambaleando (1 día sin llegar), apagado = racha en 0. */
export type EstadoFuego = 'rojo' | 'azul' | 'apagado'

export type Racha = {
  estado: EstadoFuego
  /** Días en racha, contando hoy si ya llegó a 2000. */
  dias: number
  puntosHoy: number
  /** Lo que falta hoy para llegar a 2000 (0 si ya llegó). */
  faltanHoy: number
  /** Hoy se alcanzó un hito (3, 5, 10, 15…). */
  hitoHoy: boolean
}

/** Hitos: a los 3 días, a los 5 y desde ahí cada 5. */
export function esHito(dias: number): boolean {
  return dias === 3 || (dias >= 5 && dias % 5 === 0)
}

/** Fecha de hoy en la zona horaria dada. El día cierra a medianoche (00:00 a 00:00). */
export function hoyEn(timeZone: string, ahora: Date = new Date()): Day {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

export function sumarDias(day: Day, n: number): Day {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Lunes de la semana del día dado (la semana va de lunes a domingo). */
export function inicioDeSemana(day: Day): Day {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay() // 0 = domingo
  return sumarDias(day, -((dow + 6) % 7))
}

type Entrada = {
  /** Puntos de cada día con actividad. Los días que faltan valen 0. */
  puntosPorDia: Record<Day, number>
  /** Días libres elegidos (sábado o domingo, uno por semana). No rompen la racha. */
  diasLibres: Iterable<Day>
  /** Primer día que cuenta (por ejemplo, el día en que se creó la cuenta). */
  desde: Day
  hoy: Day
}

/**
 * Calcula el fueguito recorriendo los días cerrados desde `desde` hasta ayer:
 * - día con 2000 o más: la racha suma y el fuego queda rojo;
 * - primer día sin llegar: azul, la racha sigue viva;
 * - segundo día seguido sin llegar: apagado y la racha vuelve a 0;
 * - día libre sin llegar: no cuenta ni rompe. Si igual llegó a 2000, suma.
 * Hoy recién suma cuando llega a 2000; mientras tanto se ve el estado de ayer.
 */
export function calcularRacha({ puntosPorDia, diasLibres, desde, hoy }: Entrada): Racha {
  const libres = new Set(diasLibres)
  let estado: EstadoFuego = 'apagado'
  let dias = 0

  for (let d = desde; d < hoy; d = sumarDias(d, 1)) {
    const llego = (puntosPorDia[d] ?? 0) >= MINIMO_DIARIO
    if (llego) {
      dias += 1
      estado = 'rojo'
    } else if (libres.has(d)) {
      continue
    } else if (estado === 'rojo') {
      estado = 'azul'
    } else {
      estado = 'apagado'
      dias = 0
    }
  }

  const puntosHoy = puntosPorDia[hoy] ?? 0
  const llegoHoy = puntosHoy >= MINIMO_DIARIO
  if (llegoHoy) {
    dias += 1
    estado = 'rojo'
  }

  return {
    estado,
    dias,
    puntosHoy,
    faltanHoy: Math.max(0, MINIMO_DIARIO - puntosHoy),
    hitoHoy: llegoHoy && esHito(dias),
  }
}

/** Estado del fuego de cada día cerrado, para pintar el calendario. */
export function estadosPorDia({ puntosPorDia, diasLibres, desde, hoy }: Entrada): Record<Day, EstadoFuego | 'libre'> {
  const libres = new Set(diasLibres)
  const out: Record<Day, EstadoFuego | 'libre'> = {}
  let estado: EstadoFuego = 'apagado'

  for (let d = desde; d < hoy; d = sumarDias(d, 1)) {
    const llego = (puntosPorDia[d] ?? 0) >= MINIMO_DIARIO
    if (llego) estado = 'rojo'
    else if (libres.has(d)) {
      out[d] = 'libre'
      continue
    } else estado = estado === 'rojo' ? 'azul' : 'apagado'
    out[d] = estado
  }
  return out
}

/** Cuánto falta para un permitido (0 si alcanza). */
export function faltaParaPermitido(billetera: number, permitido: Permitido): number {
  return Math.max(0, PERMITIDOS[permitido] - billetera)
}
