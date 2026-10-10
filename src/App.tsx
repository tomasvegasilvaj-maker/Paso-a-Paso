import { useSession } from './lib/useSession'
import { Login } from './screens/Login'
import { Shell } from './screens/Shell'

export default function App() {
  const session = useSession()

  // Mientras Supabase recupera la sesión guardada no se muestra nada, para no parpadear el login.
  if (session === undefined) return null
  return session ? <Shell session={session} /> : <Login />
}
