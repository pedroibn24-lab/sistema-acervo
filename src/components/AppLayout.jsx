import { NavLink, Outlet, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import Brand from './Brand'
import ThemeToggle from './ThemeToggle'

/** @param {{ isActive: boolean }} state */
const linkClass = ({ isActive }) =>
  `text-sm transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`

/** Casca das telas autenticadas: cabeçalho da marca, navegação e sair. */
export default function AppLayout() {
  const navigate = useNavigate()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Brand size="sm" />
            <nav className="flex items-center gap-5">
              <NavLink to="/dashboard" className={linkClass}>
                Painel
              </NavLink>
              <NavLink to="/perfumes" className={linkClass}>
                Perfumes
              </NavLink>
              <NavLink to="/clientes" className={linkClass}>
                Clientes
              </NavLink>
              <NavLink to="/estoque" className={linkClass}>
                Estoque
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={sair}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
