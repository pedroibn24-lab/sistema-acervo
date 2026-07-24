import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useCliente, useSacolinhasCliente } from '../features/clientes/useClientes'
import { formatarEndereco } from '../features/clientes/formatarEndereco'

const FILTROS_PAGAMENTO = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'pago', label: 'Pagos' },
  { valor: 'pendente', label: 'Pendentes' },
]

const brl = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0))

/** @param {string | null | undefined} iso */
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

/** Uma sacolinha do histórico, com os itens comprados nela dentro. */
function SacolinhaCard({ sacolinha, itens }) {
  const aberta = sacolinha.status_envio !== 'enviado'
  const total = itens.reduce((soma, it) => soma + Number(it.preco_venda || 0), 0)
  const temFrete = Number(sacolinha.valor_frete) > 0

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg text-ink">
            {aberta ? 'Sacolinha em aberto' : `Enviada em ${formatarData(sacolinha.enviado_em)}`}
          </p>
          <p className="text-xs text-muted">
            {itens.length} {itens.length === 1 ? 'item' : 'itens'} · {brl(total)}
            {temFrete
              ? ` · frete ${brl(sacolinha.valor_frete)} ${sacolinha.frete_pago ? '(pago)' : '(pendente)'}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              aberta ? 'bg-gold/15 text-gold' : 'border border-border text-muted'
            }`}
          >
            {aberta ? 'Em aberto' : 'Enviada'}
          </span>
          {aberta && (
            <Link to="/vendas" className="text-sm font-medium text-gold hover:underline">
              Gerenciar →
            </Link>
          )}
        </div>
      </div>

      <ul className="mt-3 grid gap-2 border-t border-border pt-3">
        {itens.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">
              {it.perfumes?.nome ?? 'Perfume'} · {it.ml}ml {it.tipo === 'apc' ? '(APC)' : ''}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-muted">{brl(it.preco_venda)}</span>
              <span
                className={`text-xs uppercase tracking-wider ${
                  it.status_pagamento_perfume === 'pago' ? 'text-gold' : 'text-muted'
                }`}
              >
                {it.status_pagamento_perfume === 'pago' ? 'Pago' : 'Pendente'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tela de detalhe do cliente: dados + totais + histórico por sacolinha. */
export default function ClienteDetalhe() {
  const { id } = useParams()
  const [filtroPagamento, setFiltroPagamento] = useState('todos')
  const cliente = useCliente(id)
  const historico = useSacolinhasCliente(id)

  const sacolinhas = historico.data ?? []
  const itens = sacolinhas.flatMap((s) => s.vendas_itens ?? [])
  const total = itens.reduce((soma, it) => soma + Number(it.preco_venda || 0), 0)
  const pago = itens
    .filter((it) => it.status_pagamento_perfume === 'pago')
    .reduce((soma, it) => soma + Number(it.preco_venda || 0), 0)
  const pendente = total - pago

  // Aplica o filtro nos itens de cada sacolinha; esconde as que ficarem sem item.
  const sacolinhasVisiveis = sacolinhas
    .map((s) => ({
      sacolinha: s,
      itens:
        filtroPagamento === 'todos'
          ? s.vendas_itens ?? []
          : (s.vendas_itens ?? []).filter((it) => it.status_pagamento_perfume === filtroPagamento),
    }))
    .filter((g) => g.itens.length > 0)

  const cards = [
    { label: 'Total comprado', valor: brl(total), cls: 'text-ink' },
    { label: 'Pago', valor: brl(pago), cls: 'text-gold' },
    { label: 'A receber', valor: brl(pendente), cls: 'text-ink' },
  ]

  return (
    <div>
      <Link to="/clientes" className="text-sm text-gold hover:underline">
        ← Clientes
      </Link>

      <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
        {cliente.data?.nome ?? 'Cliente'}
      </h1>
      {cliente.data && (
        <p className="mt-2 text-muted">
          {cliente.data.whatsapp}
          {formatarEndereco(cliente.data) ? ` · ${formatarEndereco(cliente.data)}` : ''}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-6">
            <p className="text-xs uppercase tracking-wider text-muted">{c.label}</p>
            <p className={`mt-2 font-serif text-2xl ${c.cls}`}>{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl text-ink">Sacolinhas</h2>
        {sacolinhas.length > 0 && (
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {FILTROS_PAGAMENTO.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltroPagamento(f.valor)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filtroPagamento === f.valor ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4">
        {historico.isPending ? (
          <div className="grid gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
        ) : historico.isError ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">Não foi possível carregar as sacolinhas.</p>
            <button
              type="button"
              onClick={() => historico.refetch()}
              className="mt-3 text-sm font-medium text-gold hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : sacolinhas.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">Este cliente ainda não comprou nada.</p>
          </div>
        ) : sacolinhasVisiveis.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">
              Nenhuma compra {filtroPagamento === 'pago' ? 'paga' : 'pendente'}.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sacolinhasVisiveis.map((g) => (
              <SacolinhaCard key={g.sacolinha.id} sacolinha={g.sacolinha} itens={g.itens} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
