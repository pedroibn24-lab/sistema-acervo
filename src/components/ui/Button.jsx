/**
 * Botão base do design system.
 * @param {object} props
 * @param {'primary' | 'ghost'} [props.variant]
 * @param {'button' | 'submit' | 'reset'} [props.type]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium tracking-wide transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50'

  const variants = {
    primary: 'bg-ink text-bg hover:bg-ink/90',
    ghost: 'border border-border bg-transparent text-ink hover:bg-surface-2',
  }

  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
