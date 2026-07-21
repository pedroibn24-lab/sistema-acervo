import { Link, useParams } from 'react-router'
import { useCliente, useComprasCliente } from '../features/clientes/useClientes'

const brl = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0))

/** @param {string | null | undefined} iso */
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

/** Tela de detalhe do cliente: dados + histórico de compras + totais. */
export default function ClienteDetalhe() {
  const { id } = useParams()
  const cliente = useCliente(id)
  const compras = useComprasCliente(id)

  const itens = compras.data ?? []
  const total = itens.reduce((soma, it) => soma + Number(it.preco_venda || 0), 0)
  const pago = itens
    .filter((it) => it.status_pagamento_perfume === 'pago')
    .reduce((soma, it) => soma + Number(it.preco_venda || 0), 0)
  const pendente = total - pago

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
          {cliente.data.endereco ? ` · ${cliente.data.endereco}` : ''}
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

      <h2 className="mt-10 font-serif text-2xl text-ink">Compras</h2>
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
        ) : (
          <ul className="grid gap-2">
            {itens.map((it) => (
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
