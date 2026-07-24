import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useCliente, useComprasCliente } from '../features/clientes/useClientes'
import { useSacolinhaAberta } from '../features/vendas/useVendas'
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

/** Tela de detalhe do cliente: dados + histórico de compras + totais. */
export default function ClienteDetalhe() {
  const { id } = useParams()
  const [filtroPagamento, setFiltroPagamento] = useState('todos')
  const cliente = useCliente(id)
  const compras = useComprasCliente(id)
  const sacolinha = useSacolinhaAberta(id)

  const itens = compras.data ?? []
  const total = itens.reduce((soma, it) => soma + Number(it.preco_venda || 0), 0)
  const pago = itens
    .filter((it) => it.status_pagamento_perfume === 'pago')
    .reduce((soma, it) => soma + Number(it.preco_venda || 0), 0)
  const pendente = total - pago

  // A lista abaixo filtra por pagamento; os totais acima seguem mostrando o geral.
  const itensFiltrados =
    filtroPagamento === 'todos'
      ? itens
      : itens.filter((it) => it.status_pagamento_perfume === filtroPagamento)

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

      <h2 className="mt-10 font-serif text-2xl text-ink">Sacolinha em aberto</h2>
      <div className="mt-4">
        {sacolinha.isPending ? (
          <div className="skeleton h-24" />
        ) : sacolinha.data ? (
          <div className="card p-6">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <span className="text-muted">
                Itens: <span className="text-ink">{sacolinha.data.qtd_decants} decants</span>
              </span>
              <span className="text-muted">
                Total: <span className="text-ink">{brl(sacolinha.data.valor_itens)}</span>
              </span>
              {Number(sacolinha.data.valor_frete) > 0 && (
                <span className="text-muted">
                  Frete:{' '}
                  <span className="text-ink">
                    {brl(sacolinha.data.valor_frete)}{' '}
                    {sacolinha.data.frete_pago ? '(pago)' : '(pendente)'}
                  </span>
                </span>
              )}
            </div>
            <Link
              to="/vendas"
              className="mt-4 inline-block text-sm font-medium text-gold hover:underline"
            >
              Gerenciar em Vendas →
            </Link>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">Nenhuma sacolinha aberta.</p>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl text-ink">Compras</h2>
        {itens.length > 0 && (
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {FILTROS_PAGAMENTO.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltroPagamento(f.valor)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filtroPagamento === f.valor
                    ? 'bg-surface-2 text-ink'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4">
        {compras.isPending ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : compras.isError ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">Não foi possível carregar as compras.</p>
            <button
              type="button"
              onClick={() => compras.refetch()}
              className="mt-3 text-sm font-medium text-gold hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : itens.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">Este cliente ainda não comprou nada.</p>
          </div>
        ) : itensFiltrados.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">
              Nenhuma compra {filtroPagamento === 'pago' ? 'paga' : 'pendente'}.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {itensFiltrados.map((it) => (
              <li key={it.id} className="card flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="text-ink">
                    {it.perfumes?.nome ?? 'Perfume'} · {it.ml}ml{' '}
                    {it.tipo === 'apc' ? '(APC)' : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {formatarData(it.created_at)} ·{' '}
                    {it.sacolinhas?.status_envio === 'enviado' ? 'Enviado' : 'A enviar'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-ink">{brl(it.preco_venda)}</p>
                  <p
                    className={`text-xs uppercase tracking-wider ${
                      it.status_pagamento_perfume === 'pago' ? 'text-gold' : 'text-muted'
                    }`}
                  >
                    {it.status_pagamento_perfume === 'pago' ? 'Pago' : 'Pendente'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
