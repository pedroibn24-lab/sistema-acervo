import { Link } from 'react-router'
import { useFinanceiro } from '../features/financeiro/useFinanceiro'
import { useResumoOperacao } from '../features/dashboard/useResumoOperacao'
import { useCaixa } from '../features/dashboard/useCaixa'
import { useDevedores } from '../features/dashboard/useDevedores'
import { useFrete } from '../features/dashboard/useFrete'

/** @param {number | string | null | undefined} n */
const brl = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0))

/** Um número do painel. `destaque` = dourado; `danger` = vermelho (ex.: caixa negativo). */
function Metric({ label, value, pronto, destaque, danger }) {
  const cor = danger ? 'text-danger' : destaque ? 'text-gold' : 'text-ink'
  return (
    <div className="card p-6">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      {pronto ? (
        <p className={`mt-2 font-serif text-2xl ${cor}`}>{value}</p>
      ) : (
        <div className="skeleton mt-3 h-7 w-24" />
      )}
    </div>
  )
}

/** Painel: só os números que você usa no dia a dia. */
export default function Dashboard() {
  const financeiro = useFinanceiro()
  const operacao = useResumoOperacao()
  const caixa = useCaixa()
  const devedores = useDevedores()
  const frete = useFrete()

  const finPronto = !financeiro.isPending
  const opPronto = !operacao.isPending
  const caixaPronto = !caixa.isPending
  const f = financeiro.data
  const decantsAPagar = operacao.data?.decantsAPagar ?? 0
  const apcsAPagar = operacao.data?.apcsAPagar ?? 0
  const valorCaixa = Number(caixa.data?.caixa || 0)

  const temErro = financeiro.isError || operacao.isError || caixa.isError || frete.isError

  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight text-ink">Painel</h1>
      <p className="mt-2 text-muted">O que precisa da sua atenção.</p>

      {temErro && (
        <div className="card mt-6 p-6 text-center">
          <p className="text-sm text-muted">Não foi possível carregar alguns números.</p>
          <button
            type="button"
            onClick={() => {
              financeiro.refetch()
              operacao.refetch()
              caixa.refetch()
              frete.refetch()
            }}
            className="mt-3 text-sm font-medium text-gold hover:underline"
          >
            Tentar de novo
          </button>
        </div>
      )}

      <h2 className="mt-8 text-xs font-medium uppercase tracking-wider text-muted">Operação</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="Sacolinhas em aberto"
          value={operacao.data?.sacolinhasAbertas ?? 0}
          pronto={opPronto}
        />
        <Metric
          label="Decants a pagar"
          value={decantsAPagar}
          pronto={opPronto}
          destaque={decantsAPagar > 0}
        />
        <Metric
          label="APCs a pagar"
          value={apcsAPagar}
          pronto={opPronto}
          destaque={apcsAPagar > 0}
        />
      </div>

      <h2 className="mt-8 text-xs font-medium uppercase tracking-wider text-muted">Dinheiro</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="A receber" value={brl(f?.a_receber)} pronto={finPronto} />
        <Metric
          label="A receber (frete)"
          value={brl(frete.data?.a_receber_frete)}
          pronto={!frete.isPending}
        />
        <Metric label="Recebido" value={brl(f?.faturamento_recebido)} pronto={finPronto} destaque />
        <Metric label="Faturamento" value={brl(f?.faturamento_bruto)} pronto={finPronto} />
        <Metric
          label="Caixa"
          value={brl(valorCaixa)}
          pronto={caixaPronto}
          destaque={valorCaixa >= 0}
          danger={valorCaixa < 0}
        />
      </div>

      <h2 className="mt-8 text-xs font-medium uppercase tracking-wider text-muted">
        Quem está devendo
      </h2>
      <div className="mt-3">
        {devedores.isPending ? (
          <div className="grid gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : devedores.isError ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-muted">Não foi possível carregar os devedores.</p>
            <button
              type="button"
              onClick={() => devedores.refetch()}
              className="mt-3 text-sm font-medium text-gold hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : (devedores.data?.length ?? 0) === 0 ? (
          <div className="card p-8 text-center">
            <span className="text-2xl text-gold" aria-hidden="true">
              ✦
            </span>
            <p className="mt-2 text-sm text-muted">Ninguém devendo — todo mundo em dia.</p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {devedores.data.map((d) => (
              <li
                key={d.cliente_id}
                className="card flex items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-serif text-lg text-ink">{d.nome}</p>
                  <p className="text-xs text-muted">
                    {d.whatsapp} · {d.itens_pendentes}{' '}
                    {d.itens_pendentes > 1 ? 'itens pendentes' : 'item pendente'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-serif text-lg text-ink">{brl(d.total_devido)}</span>
                  <Link
                    to={`/clientes/${d.cliente_id}`}
                    className="text-sm font-medium text-gold hover:underline"
                  >
                    Ver
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
