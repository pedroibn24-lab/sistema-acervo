import { useState } from 'react'
import { getTheme, toggleTheme } from '../lib/theme'

/** Botão que alterna entre tema claro e escuro. */
export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme)

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label={theme === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
    >
      {theme === 'dark' ? '☾ Escuro' : '☀ Claro'}
    </button>
  )
}
