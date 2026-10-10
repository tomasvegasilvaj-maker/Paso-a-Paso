import type { MouseEvent } from 'react'

/** Onda (doc 03): luz que sale desde el punto tocado, para los botones grandes. */
export function onda(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const s = document.createElement('span')
  const lado = Math.max(r.width, r.height) * 2
  s.className = 'onda'
  s.style.width = s.style.height = `${lado}px`
  s.style.left = `${e.clientX - r.left - lado / 2}px`
  s.style.top = `${e.clientY - r.top - lado / 2}px`
  el.appendChild(s)
  s.addEventListener('animationend', () => s.remove())
}
