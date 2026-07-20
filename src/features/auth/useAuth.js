import { createContext, useContext } from 'react'

/**
 * @typedef {object} AuthValue
 * @property {import('@supabase/supabase-js').Session | null} session
 * @property {boolean} loading
 */

/** @type {React.Context<AuthValue | null>} */
export const AuthContext = createContext(null)

/** @returns {AuthValue} */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return ctx
}
