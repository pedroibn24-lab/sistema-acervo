import { useState } from 'react'
import { useEstoque, useSetEstoque } from '../features/estoque/useEstoque'
import Button from '../components/ui/Button'

const FRASCOS = [
  { tipo: 'frasco_5ml', label: 'Frasco 5ml' },
  { tipo: 'frasco_20ml', label: 'Frasco 20ml' },
]

/** Uma linha do estoque: mostra o atual e permite definir uma nova quantidade. */
function LinhaEstoque({ tipo, label, atual, onSalvar, salvando }) {
  const [valor, setValor] = useState(String(atual ?? 0))

  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div>
        <p className="font-serif text-xl text-ink">{label}</p>
        <p className="text-sm text-muted">Em estoque: {atual ?? 0}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="h-11 w-24 rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-gold"
          aria-label={`Quantidade de ${label}`}
        />
        <Button onClick={() => onSalvar(tipo, Math.max(0, Number(valor) || 0))} disabled={salvando}>
          Salvar
        </Button>
      </div>
    </div>
  )
}

/** Tela de estoque de frascos vazios (o que a venda de decant debita). */
export default function Estoque() {
  const { data: estoque, isPending, isError, refetch } = useEstoque()
  const setEstoque = useSetEstoque()

  function salvar(tipo, quantidade) {
    setEstoque.mutate({ tipo, quantidade })
  }

  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight text-ink">Estoque de frascos</h1>
      <p className="mt-2 text-muted">
        Quantos frascos vazios você tem. Cada venda de decant desconta um frasco automaticamente.
      </p>

      <div className="mt-8">
        {isPending ? (
          <div className="grid gap-3">
            {[0, 1].map((i) => (
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
          <div className="grid gap-3">
            {FRASCOS.map((f) => (
              <LinhaEstoque
                key={f.tipo}
                tipo={f.tipo}
                label={f.label}
                atual={estoque[f.tipo] ?? 0}
                onSalvar={salvar}
                salvando={setEstoque.isPending}
              />
            ))}
          </div>
        )}

        {setEstoque.isError && (
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
