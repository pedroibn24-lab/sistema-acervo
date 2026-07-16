import { Navigate } from 'react-router'
import { useAuth } from '../features/auth/AuthContext'

/** Protege rotas: sem sessão válida, redireciona para o login. */
export default function RequireAuth({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        <span className="text-sm">Carregando…</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/" replace />

  return children
}
