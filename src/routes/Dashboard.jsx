import { Link } from 'react-router'
import { usePerfumes } from '../features/perfumes/usePerfumes'
import { useFinanceiro } from '../features/financeiro/useFinanceiro'

/** @param {number | string | null | undefined} n */
const brl = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0))

/** Painel: visão geral com números reais do banco. */
export default function Dashboard() {
  const perfumes = usePerfumes()
  const financeiro = useFinanceiro()

  const cards = [
    {
      label: 'Perfumes no acervo',
      pronto: !perfumes.isPending,
      valor: perfumes.data?.length ?? 0,
    },
    {
      label: 'Faturamento bruto',
      pronto: !financeiro.isPending,
      valor: brl(financeiro.data?.faturamento_bruto),
    },
    {
      label: 'Lucro líquido',
      pronto: !financeiro.isPending,
      valor: brl(financeiro.data?.lucro_liquido),
    },
  ]

  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight text-ink">Painel</h1>
      <p className="mt-2 text-muted">Visão geral do seu acervo.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-6">
            <p className="text-xs uppercase tracking-wider text-muted">{card.label}</p>
            {card.pronto ? (
              <p className="mt-2 font-serif text-3xl text-ink">{card.valor}</p>
            ) : (
              <div className="skeleton mt-3 h-8 w-24" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link to="/perfumes" className="text-sm font-medium text-gold hover:underline">
          Ver e cadastrar perfumes →
        </Link>
      </div>
    </div>
  )
}
