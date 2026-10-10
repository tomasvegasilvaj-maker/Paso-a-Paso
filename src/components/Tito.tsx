import { useId } from 'react'
import './Tito.css'

export type TitoAnim = 'idle' | 'rie' | 'saluda' | 'guino' | 'salta'

type Props = {
  anim: TitoAnim
  size?: number
  glow?: boolean
}

/** Tito amarillo (el del logo). Los estados rojo, azul y apagado llegan con la tarjeta de puntos. */
export function Tito({ anim, size = 180, glow = true }: Props) {
  const id = useId().replace(/:/g, '')
  const fill = `url(#tito-g-${id})`

  return (
    <svg
      className={`tito ${anim}`}
      width={size}
      height={(size * 225) / 200}
      viewBox="0 0 200 225"
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`tito-g-${id}`} cx="38%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#fff4b0" />
          <stop offset="55%" stopColor="#ffd23f" />
          <stop offset="100%" stopColor="#e0a300" />
        </radialGradient>
        <radialGradient id={`tito-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,210,63,0.32)" />
          <stop offset="100%" stopColor="rgba(255,210,63,0)" />
        </radialGradient>
      </defs>
      {glow && <ellipse cx="100" cy="128" rx="98" ry="98" fill={`url(#tito-glow-${id})`} />}
      <ellipse cx="100" cy="216" rx="52" ry="7" fill="rgba(0,0,0,0.45)" />
      <g className="bd">
        <circle className="arm armL" cx="34" cy="150" r="12" fill={fill} />
        <g className="arm armR">
          <circle cx="166" cy="150" r="12" fill={fill} />
        </g>
        <path
          d="M100 16 C 128 52 170 84 170 138 C 170 182 139 208 100 208 C 61 208 30 182 30 138 C 30 96 62 74 80 46 C 84 64 92 70 98 66 C 96 50 96 32 100 16 Z"
          fill={fill}
        />
        <ellipse cx="72" cy="104" rx="18" ry="11" fill="rgba(255,255,255,0.4)" transform="rotate(-30 72 104)" />
        <ellipse cx="66" cy="152" rx="11" ry="6" fill="#ff6b6b" opacity="0.35" />
        <ellipse cx="134" cy="152" rx="11" ry="6" fill="#ff6b6b" opacity="0.35" />
        <g className="eyes e-n">
          <ellipse cx="80" cy="134" rx="8" ry="11" fill="#2a1a04" />
          <ellipse cx="120" cy="134" rx="8" ry="11" fill="#2a1a04" />
          <circle cx="83" cy="129" r="2.6" fill="#fff" />
          <circle cx="123" cy="129" r="2.6" fill="#fff" />
        </g>
        <g className="e-l" fill="none" stroke="#2a1a04" strokeWidth="5" strokeLinecap="round">
          <path d="M70 137 Q80 124 90 137" />
          <path d="M110 137 Q120 124 130 137" />
        </g>
        <g className="e-w">
          <ellipse cx="80" cy="134" rx="8" ry="11" fill="#2a1a04" />
          <circle cx="83" cy="129" r="2.6" fill="#fff" />
          <path d="M110 136 Q120 130 130 136" fill="none" stroke="#2a1a04" strokeWidth="5" strokeLinecap="round" />
        </g>
        <path className="m-s" d="M91 156 Q100 164 109 156" fill="none" stroke="#2a1a04" strokeWidth="4" strokeLinecap="round" />
        <path className="m-o" d="M88 153 Q100 172 112 153 Z" fill="#2a1a04" />
      </g>
    </svg>
  )
}
