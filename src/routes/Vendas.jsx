import { useState } from 'react'
import { Link } from 'react-router'
import { useClientes } from '../features/clientes/useClientes'
import { usePerfumes } from '../features/perfumes/usePerfumes'
import {
  useSacolinhaAberta,
  useItensSacolinha,
  useVenderDecant,
  useVenderApc,
  useApagarItem,
  useMarcarPagoPerfume,
} from '../features/vendas/useVendas'
import Button from '../components/ui/Button'

const MLS = [3, 5, 10, 20]
const brl = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0))

const selectCls =
  'h-11 rounded-lg border border-border bg-surface px-3.5 text-sm text-ink focus:border-gold'

function PrecisaCadastro({ tipo, para }) {
  return (
    <div className="card p-10 text-center">
      <span className="text-3xl text-gold" aria-hidden="true">
        ✦
      </span>
      <h2 className="mt-3 font-serif text-2xl text-ink">Cadastre um {tipo} primeiro</h2>
      <p className="mt-1 text-sm text-muted">
        Você precisa de pelo menos um {tipo} para registrar uma venda.
      </p>
      <div className="mt-4 flex justify-center">
        <Link to={`/${para}`} className="text-sm font-medium text-gold hover:underline">
          Ir para {para} →
        </Link>
      </div>
    </div>
  )
}

/** Uma linha de item da sacolinha: status de pagamento e desfazer (com confirmação). */
function ItemRow({ item, onApagar, onTogglePago, ocupado }) {
  const [confirmando, setConfirmando] = useState(false)
  const pago = item.status_pagamento_perfume === 'pago'

  return (
    <li className="card flex items-center justify-between gap-3 p-4 text-sm">
      <span className="text-ink">
        {item.perfumes?.nome ?? 'Perfume'} · {item.ml}ml {item.tipo === 'apc' ? '(APC)' : ''}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-muted">{brl(item.preco_venda)}</span>
        <button
          type="button"
          onClick={() => onTogglePago(item.id, !pago)}
          disabled={ocupado}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            pago ? 'bg-gold/15 text-gold' : 'border border-border text-muted hover:text-ink'
          }`}
        >
          {pago ? '✓ Pago' : 'Pendente'}
        </button>
        {confirmando ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-muted">Desfazer?</span>
            <button
              type="button"
              onClick={() => onApagar(item.id)}
              disabled={ocupado}
              className="font-medium text-danger"
            >
              Sim
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="text-muted">
              Não
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            aria-label="Desfazer venda"
            className="text-muted transition-colors hover:text-danger"
          >
            ✕
          </button>
        )}
      </div>
    </li>
  )
}

/** Tela de vendas: vende decants para a sacolinha de um cliente (trava do APC ao vivo). */
export default function Vendas() {
  const clientes = useClientes()
  const perfumes = usePerfumes()

  const [clienteId, setClienteId] = useState('')
  const [perfumeId, setPerfumeId] = useState('')
  const [ml, setMl] = useState('')
  const [erro, setErro] = useState('')

  const sacolinha = useSacolinhaAberta(clienteId)
  const itens = useItensSacolinha(sacolinha.data?.id)
  const vender = useVenderDecant()
  const venderApc = useVenderApc()
  const apagar = useApagarItem()
  const marcarPago = useMarcarPagoPerfume()
  const perfumeSel = (perfumes.data ?? []).find((p) => p.id === perfumeId)

  async function onVender(e) {
    e.preventDefault()
    setErro('')
    try {
      await vender.mutateAsync({ clienteId, perfumeId, ml: Number(ml) })
      setPerfumeId('')
      setMl('')
    } catch (err) {
      // A mensagem da trava/estoque vem do banco e é feita para o usuário ler.
      setErro(err?.message || 'Não foi possível registrar a venda.')
    }
  }

  async function onVenderApc() {
    setErro('')
    try {
      await venderApc.mutateAsync({ clienteId, perfumeId })
      setPerfumeId('')
      setMl('')
    } catch (err) {
      setErro(err?.message || 'Não foi possível vender o APC.')
    }
  }

  if (!clientes.isPending && (clientes.data?.length ?? 0) === 0)
    return <PrecisaCadastro tipo="cliente" para="clientes" />
  if (!perfumes.isPending && (perfumes.data?.length ?? 0) === 0)
    return <PrecisaCadastro tipo="perfume" para="perfumes" />

  const s = sacolinha.data

  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight text-ink">Vendas</h1>
      <p className="mt-2 text-muted">Venda decants para a sacolinha de um cliente.</p>

      <div className="mt-8 max-w-sm">
        <label htmlFor="cliente" className="text-xs font-medium uppercase tracking-wider text-muted">
          Cliente
        </label>
        <select
          id="cliente"
          value={clienteId}
          onChange={(e) => {
            setClienteId(e.target.value)
            setErro('')
          }}
          className={`mt-1.5 w-full ${selectCls}`}
        >
          <option value="">Selecione um cliente</option>
          {(clientes.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {clienteId && (
        <>
          <div className="card mt-6 p-6">
            {sacolinha.isPending ? (
              <div className="skeleton h-6 w-48" />
            ) : s ? (
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <span className="text-muted">
                  Sacolinha: <span className="text-ink">{s.qtd_decants} decants</span>
                </span>
                <span className="text-muted">
                  Total: <span className="text-ink">{brl(s.valor_itens)}</span>
                </span>
                <span className="text-muted">
                  Caixas sugeridas:{' '}
                  <span className="text-ink">
                    {s.caixas_coletivas_sugeridas} coletiva(s) + {s.caixas_individuais_sugeridas}{' '}
                    individual(is)
                  </span>
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Nenhuma sacolinha aberta ainda — a primeira venda abre uma.
              </p>
            )}
          </div>

          <form onSubmit={onVender} className="card mt-4 grid gap-4 p-6 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="perfume" className="text-xs font-medium uppercase tracking-wider text-muted">
                Perfume
              </label>
              <select
                id="perfume"
                value={perfumeId}
                onChange={(e) => setPerfumeId(e.target.value)}
                className={selectCls}
              >
                <option value="">Selecione</option>
                {(perfumes.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.ml_livres_decants}ml livres)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ml" className="text-xs font-medium uppercase tracking-wider text-muted">
                Tamanho
              </label>
              <select id="ml" value={ml} onChange={(e) => setMl(e.target.value)} className={selectCls}>
                <option value="">ml</option>
                {MLS.map((m) => (
                  <option key={m} value={m}>
                    {m}ml
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!perfumeId || !ml || vender.isPending}>
                {vender.isPending ? 'Vendendo…' : 'Vender decant'}
              </Button>
            </div>

            {erro && (
              <p className="text-sm text-danger sm:col-span-3" role="alert">
                {erro}
              </p>
            )}
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              onClick={onVenderApc}
              disabled={!perfumeId || perfumeSel?.pode_vender_apc === false || venderApc.isPending}
            >
              {venderApc.isPending ? 'Vendendo APC…' : 'Vender APC do perfume'}
            </Button>
            <span className="text-xs text-muted">
              {perfumeSel && perfumeSel.pode_vender_apc === false
                ? 'O APC deste perfume já foi vendido.'
                : 'Vende a apresentação completa (o APC) — a quantidade reservada do perfume selecionado.'}
            </span>
          </div>

          {s?.id && !itens.isPending && (itens.data?.length ?? 0) > 0 && (
            <ul className="mt-6 grid gap-2">
              {itens.data.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  onApagar={(id) => apagar.mutate(id)}
                  onTogglePago={(id, pago) => marcarPago.mutate({ id, pago })}
                  ocupado={apagar.isPending || marcarPago.isPending}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
