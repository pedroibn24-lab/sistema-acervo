/**
 * Campo de texto com rótulo e mensagem de erro. Aceita o spread do
 * react-hook-form: <Input id="x" label="X" {...register('x')} error={...} />
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {string} [props.type]
 * @param {string} [props.error]
 * @param {string} [props.className]
 */
export default function Input({ id, label, type = 'text', error, className = '', ...rest }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={error ? 'true' : undefined}
        className={`h-11 rounded-lg border bg-surface px-3.5 text-sm text-ink transition-colors placeholder:text-muted/60 focus:border-gold ${
          error ? 'border-danger' : 'border-border'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
