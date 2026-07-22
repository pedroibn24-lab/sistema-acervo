import { useState } from 'react'
import { useEstoque, useAddEstoque } from '../features/estoque/useEstoque'
import Button from '../components/ui/Button'

const FRASCOS = [
  { tipo: 'frasco_5ml', label: 'Frasco 5ml' },
  { tipo: 'frasco_20ml', label: 'Frasco 20ml' },
]

const CAIXAS = [
  { tipo: 'caixa_coletiva', label: 'Caixa coletiva' },
  { tipo: 'caixa_individual', label: 'Caixa individual' },
  { tipo: 'caixa_correio', label: 'Caixa de correio' },
]

/** Uma linha do estoque: mostra o atual e adiciona a quantidade comprada. */
function LinhaEstoque({ tipo, label, atual, onAdicionar, salvando }) {
  const [valor, setValor] = useState('')

  async function adicionar() {
    const qtd = Math.floor(Number(valor) || 0)
    if (qtd < 1) return
    try {
      await onAdicionar(tipo, qtd)
      setValor('') // limpa o campo só se deu certo
    } catch {
      // o erro é mostrado pela tela; mantém o valor digitado pra tentar de novo
    }
  }

  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div>
        <p className="font-serif text-xl text-ink">{label}</p>
        <p className="text-sm text-muted">Em estoque: {atual ?? 0}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Comprei…"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          className="h-11 w-28 rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-gold"
          aria-label={`Quantos frascos de ${label} adicionar`}
        />
        <Button onClick={adicionar} disabled={salvando || Math.floor(Number(valor) || 0) < 1}>
          Adicionar
        </Button>
      </div>
    </div>
  )
}

/** Tela de estoque de frascos vazios (o que a venda de decant debita). */
export default function Estoque() {
  const { data: estoque, isPending, isError, refetch } = useEstoque()
  const addEstoque = useAddEstoque()

  function adicionar(tipo, delta) {
    return addEstoque.mutateAsync({ tipo, delta })
  }

  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight text-ink">Estoque</h1>
      <p className="mt-2 text-muted">
        Frascos e caixas que você tem. Digite quantos comprou e clique em Adicionar — o valor soma ao
        estoque. Vender um decant desconta um frasco; enviar uma sacolinha desconta as caixas.
      </p>

      <div className="mt-8">
        {isPending ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : isError ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">Não foi possível carregar o estoque.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-gold hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <div className="grid gap-8">
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Frascos</h2>
              <div className="grid gap-3">
                {FRASCOS.map((f) => (
                  <LinhaEstoque
                    key={f.tipo}
                    tipo={f.tipo}
                    label={f.label}
                    atual={estoque[f.tipo] ?? 0}
                    onAdicionar={adicionar}
                    salvando={addEstoque.isPending}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Caixas</h2>
              <div className="grid gap-3">
                {CAIXAS.map((c) => (
                  <LinhaEstoque
                    key={c.tipo}
                    tipo={c.tipo}
                    label={c.label}
                    atual={estoque[c.tipo] ?? 0}
                    onAdicionar={adicionar}
                    salvando={addEstoque.isPending}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {addEstoque.isError && (
          <p className="mt-3 text-sm text-danger" role="alert">
            Não foi possível salvar o estoque. Tente de novo.
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-muted">
        Lembrete: decants de 3ml e 5ml usam o frasco de 5ml; os de 10ml e 20ml usam o de 20ml.
      </p>
    </div>
  )
}
