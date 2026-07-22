import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import Brand from './Brand'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { to: '/dashboard', label: 'Painel' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/perfumes', label: 'Perfumes' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/estoque', label: 'Estoque' },
]

/** Link do menu lateral (desktop): vira uma "pílula" destacada quando ativo. */
const sideLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-surface-2 font-medium text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
  }`

/** Link do menu de topo (mobile). */
const topLinkClass = ({ isActive }) =>
  `whitespace-nowrap text-sm transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`

/** Esqueleto cinza mostrado enquanto o pedaço da tela é baixado. */
function CarregandoTela() {
  return (
    <div className="grid gap-4">
      <div className="skeleton h-10 w-56" />
      <div className="skeleton h-40" />
    </div>
  )
}

/** Botão de sair — reutilizado no menu lateral e no cabeçalho mobile. */
function BotaoSair({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      Sair
    </button>
  )
}

/** Casca das telas autenticadas: menu lateral no desktop, cabeçalho no mobile. */
export default function AppLayout() {
  const navigate = useNavigate()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    // h-dvh + overflow-hidden: a página em si não rola; só a área principal rola,
    // então o menu lateral fica fixo no lugar.
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      {/* Menu lateral — fixo, só no desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-5 md:flex">
        <Brand size="sm" />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={sideLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between pt-6">
          <ThemeToggle />
          <BotaoSair onClick={sair} />
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Cabeçalho — só no mobile */}
        <header className="shrink-0 border-b border-border md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Brand size="sm" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <BotaoSair onClick={sair} />
            </div>
          </div>
          <nav className="flex gap-5 overflow-x-auto px-4 pb-3">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={topLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={<CarregandoTela />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
