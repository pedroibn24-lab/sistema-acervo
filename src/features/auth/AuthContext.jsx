import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * @typedef {object} AuthValue
 * @property {import('@supabase/supabase-js').Session | null} session
 * @property {boolean} loading
 */

/** @type {React.Context<AuthValue | null>} */
const AuthContext = createContext(null)

/** Provê a sessão do usuário logado para o app inteiro. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(
    /** @type {import('@supabase/supabase-js').Session | null} */ (null),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // useEffect aqui é o uso correto: sincronizar com um sistema externo
    // (o Auth do Supabase), não buscar dados de tela.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

/** @returns {AuthValue} */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return ctx
}
