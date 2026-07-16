// Controle do tema claro/escuro. O tema é aplicado no <html> via data-theme,
// e as cores trocam pelas CSS variables em index.css.

const KEY = 'theme'

/** @returns {'light' | 'dark'} */
export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage indisponível — usa o padrão
  }
  return 'light'
}

/** @param {'light' | 'dark'} theme */
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // sem persistência; segue só na sessão
  }
}

/** Alterna claro/escuro e devolve o tema novo. @returns {'light' | 'dark'} */
export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/** Reaplica o tema salvo no carregamento do app. */
export function applyInitialTheme() {
  setTheme(getTheme())
}
