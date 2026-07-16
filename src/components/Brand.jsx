/**
 * Marca do Acervo Raro: a estrela ✦ dourada + o nome em serifada.
 * @param {object} props
 * @param {'sm' | 'lg'} [props.size]
 */
export default function Brand({ size = 'lg' }) {
  const big = size === 'lg'
  return (
    <div className="flex items-center gap-2.5">
      <span className={big ? 'text-2xl text-gold' : 'text-lg text-gold'} aria-hidden="true">
        ✦
      </span>
      <span
        className={`font-serif font-semibold tracking-wide text-ink ${big ? 'text-2xl' : 'text-lg'}`}
      >
        Acervo Raro
      </span>
    </div>
  )
}
