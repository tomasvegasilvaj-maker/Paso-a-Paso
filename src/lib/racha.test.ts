import { describe, expect, it } from 'vitest'
import {
  calcularRacha,
  esHito,
  estadosPorDia,
  faltaParaPermitido,
  hoyEn,
  inicioDeSemana,
  sumarDias,
} from './racha'

// Arma { día: puntos } a partir de una lista que arranca en `desde`.
function serie(desde: string, puntos: number[]) {
  return Object.fromEntries(puntos.map((p, i) => [sumarDias(desde, i), p]))
}

const DESDE = '2026-10-01' // jueves

describe('calcularRacha', () => {
  it('arranca apagado y sin días', () => {
    const r = calcularRacha({ puntosPorDia: {}, diasLibres: [], desde: DESDE, hoy: DESDE })
    expect(r).toMatchObject({ estado: 'apagado', dias: 0, puntosHoy: 0, faltanHoy: 2000 })
  })

  it('llegar a 2000 enciende el fuego y suma el día', () => {
    const r = calcularRacha({ puntosPorDia: { [DESDE]: 2000 }, diasLibres: [], desde: DESDE, hoy: DESDE })
    expect(r).toMatchObject({ estado: 'rojo', dias: 1, faltanHoy: 0 })
  })

  it('hoy todavía sin llegar muestra el estado de ayer y no suma', () => {
    const puntosPorDia = serie(DESDE, [2400, 2100, 500])
    const r = calcularRacha({ puntosPorDia, diasLibres: [], desde: DESDE, hoy: '2026-10-03' })
    expect(r).toMatchObject({ estado: 'rojo', dias: 2, puntosHoy: 500, faltanHoy: 1500 })
  })

  it('un día sin llegar pasa a azul y la racha sigue viva', () => {
    const puntosPorDia = serie(DESDE, [2400, 2100, 300])
    const r = calcularRacha({ puntosPorDia, diasLibres: [], desde: DESDE, hoy: '2026-10-04' })
    expect(r).toMatchObject({ estado: 'azul', dias: 2 })
  })

  it('desde azul, llegar a 2000 vuelve a rojo y la racha continúa', () => {
    const puntosPorDia = serie(DESDE, [2400, 2100, 300, 2000])
    const r = calcularRacha({ puntosPorDia, diasLibres: [], desde: DESDE, hoy: '2026-10-04' })
    expect(r).toMatchObject({ estado: 'rojo', dias: 3 })
  })

  it('dos días seguidos sin llegar apaga el fuego y la racha vuelve a 0', () => {
    const puntosPorDia = serie(DESDE, [2400, 2100, 300, 0])
    const r = calcularRacha({ puntosPorDia, diasLibres: [], desde: DESDE, hoy: '2026-10-05' })
    expect(r).toMatchObject({ estado: 'apagado', dias: 0 })
  })

  it('después de apagarse, la racha arranca de nuevo desde 1', () => {
    const puntosPorDia = serie(DESDE, [2400, 0, 0, 2200])
    const r = calcularRacha({ puntosPorDia, diasLibres: [], desde: DESDE, hoy: '2026-10-04' })
    expect(r).toMatchObject({ estado: 'rojo', dias: 1 })
  })

  it('el día libre no rompe la racha ni suma si no llegó', () => {
    // Jue 1, vie 2, sáb 3 libre sin puntos, dom 4.
    const puntosPorDia = serie(DESDE, [2400, 2100, 0, 2300])
    const r = calcularRacha({ puntosPorDia, diasLibres: ['2026-10-03'], desde: DESDE, hoy: '2026-10-05' })
    expect(r).toMatchObject({ estado: 'rojo', dias: 3 })
  })

  it('el día libre tampoco cuenta como el primer día sin llegar', () => {
    // Vie 2 llega, sáb 3 libre, dom 4 no llega: queda azul, no apagado.
    const puntosPorDia = serie(DESDE, [2400, 2100, 0, 0])
    const r = calcularRacha({ puntosPorDia, diasLibres: ['2026-10-03'], desde: DESDE, hoy: '2026-10-05' })
    expect(r).toMatchObject({ estado: 'azul', dias: 2 })
  })

  it('si en el día libre igual llegó a 2000, suma', () => {
    const puntosPorDia = serie(DESDE, [2400, 2100, 2000])
    const r = calcularRacha({ puntosPorDia, diasLibres: ['2026-10-03'], desde: DESDE, hoy: '2026-10-04' })
    expect(r.dias).toBe(3)
  })

  it('avisa el hito el día que se alcanza', () => {
    const puntosPorDia = serie(DESDE, [2000, 2000, 2000])
    expect(calcularRacha({ puntosPorDia, diasLibres: [], desde: DESDE, hoy: '2026-10-03' }).hitoHoy).toBe(true)
    expect(calcularRacha({ puntosPorDia, diasLibres: [], desde: DESDE, hoy: '2026-10-02' }).hitoHoy).toBe(false)
  })
})

describe('esHito', () => {
  it('3, 5 y cada 5 desde ahí', () => {
    const hitos = Array.from({ length: 30 }, (_, i) => i + 1).filter(esHito)
    expect(hitos).toEqual([3, 5, 10, 15, 20, 25, 30])
  })
})

describe('estadosPorDia', () => {
  it('pinta cada día cerrado del calendario', () => {
    const puntosPorDia = serie(DESDE, [2400, 300, 0, 2000])
    const out = estadosPorDia({ puntosPorDia, diasLibres: ['2026-10-03'], desde: DESDE, hoy: '2026-10-05' })
    expect(out).toEqual({
      '2026-10-01': 'rojo',
      '2026-10-02': 'azul',
      '2026-10-03': 'libre',
      '2026-10-04': 'rojo',
    })
  })
})

describe('fechas', () => {
  it('el día cambia a medianoche de Córdoba, no de UTC', () => {
    // 02:30 UTC del 11 = 23:30 del 10 en Córdoba (UTC-3).
    expect(hoyEn('America/Argentina/Cordoba', new Date('2026-10-11T02:30:00Z'))).toBe('2026-10-10')
    expect(hoyEn('America/Argentina/Cordoba', new Date('2026-10-11T03:00:00Z'))).toBe('2026-10-11')
  })

  it('la semana arranca el lunes', () => {
    expect(inicioDeSemana('2026-10-10')).toBe('2026-10-05') // sábado
    expect(inicioDeSemana('2026-10-11')).toBe('2026-10-05') // domingo
    expect(inicioDeSemana('2026-10-12')).toBe('2026-10-12') // lunes
  })

  it('sumarDias cruza fin de mes', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01')
  })
})

describe('faltaParaPermitido', () => {
  it('calcula lo que falta y nunca da negativo', () => {
    expect(faltaParaPermitido(4000, 'chico')).toBe(1250)
    expect(faltaParaPermitido(9000, 'grande')).toBe(0)
  })
})
