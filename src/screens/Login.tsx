import { useState } from 'react'
import { Tito } from '../components/Tito'
import { useTitoPoke } from '../components/useTitoPoke'
import { signInWithGoogle, supabase } from '../lib/supabase'
import './Login.css'

const LABELS = { idle: 'Tocá a Tito', rie: 'Jaja', saluda: '¡Hola!', guino: 'Vos podés', salta: '¡Vamos!' }

export function Login() {
  const { anim, poke } = useTitoPoke()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const login = async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('No se pudo iniciar sesión. Probá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <main className="login screen">
      <div className="login-top">
        <button className="login-tito" onClick={poke} aria-label="Tocar a Tito">
          <Tito anim={anim} />
        </button>
        <p className={`login-label${anim === 'idle' ? '' : ' active'}`}>{LABELS[anim]}</p>
        <div className="login-title">
          <h1>Paso a Paso</h1>
          <p>Un día a la vez. Sumá puntos, cuidá tu fuego.</p>
        </div>
      </div>

      <div className="login-bottom">
        {supabase ? (
          <>
            <button className="login-google hundir" onClick={login} disabled={loading}>
              <span className="login-g" aria-hidden="true">
                G
              </span>
              {loading ? 'Abriendo Google…' : 'Continuar con Google'}
            </button>
            <span className="login-note">{error ?? 'Tus datos se sincronizan entre celular y compu'}</span>
          </>
        ) : (
          <p className="login-note" role="alert">
            Falta configurar Supabase: copiá <code>.env.example</code> a <code>.env.local</code> y completá las claves.
          </p>
        )}
      </div>
    </main>
  )
}
