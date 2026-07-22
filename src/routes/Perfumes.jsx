import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  usePerfumes,
  useAddPerfume,
  useFinalizarPerfume,
  useDeletePerfume,
} from '../features/perfumes/usePerfumes'
import { perfumeFormSchema } from '../features/perfumes/schema'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import DeleteButton from '../components/ui/DeleteButton'

const SITUACAO = {
  disponivel: { label: 'Disponível', cls: 'text-gold' },
  apc_vendido: { label: 'APC vendido · vende decant', cls: 'text-gold' },
  so_apc: { label: 'Decants esgotados · só APC', cls: 'text-muted' },
  esgotado: { label: 'Esgotado', cls: 'text-muted' },
}

/**
 * Máscara de dinheiro: recebe o que foi digitado e devolve no formato brasileiro.
 * Formata pela regra dos centavos — os 2 últimos dígitos são os centavos.
 * Ex.: "450" -> "4,50"   |   "150000" -> "1.500,00"
 * @param {string} valor
 */
function mascaraDinheiro(valor) {
  const digitos = String(valor).replace(/\D/g, '') // mantém só os números
  if (digitos === '') return ''
  const numero = Number(digitos) / 100 // os 2 últimos viram centavos
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Embrulha o register do react-hook-form para aplicar a máscara a cada tecla:
 * formata o valor e repassa o texto já formatado para o formulário.
 * @param {{ onChange: (e: any) => void }} reg  o retorno de register('campo')
 */
function comMascara(reg) {
  return {
    ...reg,
    onChange: (e) => {
      e.target.value = mascaraDinheiro(e.target.value)
      reg.onChange(e)
    },
  }
}

/**
 * Botão de finalizar/reativar um frasco.
 * - Finalizado: mostra "Reativar".
 * - Ainda vendável: mostra "Finalizar" com confirmação (é uma ação séria).
 * - Esgotado naturalmente (vendeu tudo): não mostra nada.
 */
function FinalizarButton({ finalizado, vendavel, disabled, onFinalizar, onReativar }) {
  const [confirmando, setConfirmando] = useState(false)

  if (finalizado) {
    return (
      <button
        type="button"
        onClick={onReativar}
        disabled={disabled}
        className="text-sm font-medium text-gold hover:underline"
      >
        Reativar
      </button>
    )
  }

  if (!vendavel) return null

  if (confirmando) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-muted">Finalizar?</span>
        <button
          type="button"
          onClick={onFinalizar}
          disabled={disabled}
          className="font-medium text-danger"
        >
          Sim
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className="text-muted">
          Não
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      disabled={disabled}
      className="text-sm font-medium text-muted transition-colors hover:text-ink"
    >
      Finalizar
    </button>
  )
}

/** Tela de perfumes: cadastro + lista, com dados reais do banco. */
export default function Perfumes() {
  const [aberto, setAberto] = useState(false)
  const [erroDelete, setErroDelete] = useState('')
  const [busca, setBusca] = useState('')
  const [campoBusca, setCampoBusca] = useState('nome') // 'nome' ou 'marca'
  const [filtro, setFiltro] = useState('todos')
  const [ordenacao, setOrdenacao] = useState('recentes')
  const { data: perfumes, isPending, isError, refetch } = usePerfumes()
  const addPerfume = useAddPerfume()
  const finalizarPerfume = useFinalizarPerfume()
  const deletePerfume = useDeletePerfume()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(perfumeFormSchema),
    defaultValues: {
      nome: '',
      marca: '',
      volume_total_ml: '',
      tamanho_apc_ml: '',
      preco_custo_total: '',
      valor_venda_por_ml: '',
    },
  })

  async function onSubmit(values) {
    await addPerfume.mutateAsync(values)
    reset()
    setAberto(false)
  }

  // 1) Filtra por texto (nome ou marca) E pelo filtro de situação/APC.
  const termoBusca = busca.trim().toLowerCase()
  const perfumesFiltrados = (perfumes ?? []).filter((p) => {
    // busca por texto
    if (termoBusca && !String(p[campoBusca] ?? '').toLowerCase().includes(termoBusca)) {
      return false
    }
    // filtro de situação / APC
    if (filtro === 'nao_esgotado') return p.situacao !== 'esgotado'
    if (filtro === 'esgotado') return p.situacao === 'esgotado'
    if (filtro === 'apc_vendido') return p.apc_vendido === true
    if (filtro === 'apc_disponivel') return p.apc_vendido === false
    return true // 'todos'
  })

  // 2) Ordena o resultado. 'recentes' mantém a ordem que veio do banco.
  const perfumesOrdenados = [...perfumesFiltrados]
  if (ordenacao === 'nome') {
    perfumesOrdenados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  } else if (ordenacao === 'mais_livre') {
    perfumesOrdenados.sort((a, b) => b.ml_livres_decants - a.ml_livres_decants)
  } else if (ordenacao === 'menos_livre') {
    perfumesOrdenados.sort((a, b) => a.ml_livres_decants - b.ml_livres_decants)
  }

  async function apagarPerfume(id) {
    setErroDelete('')
    try {
      await deletePerfume.mutateAsync(id)
    } catch (err) {
      setErroDelete(
        err?.code === '23503'
          ? 'Não dá pra apagar este perfume: ele já tem vendas registradas.'
          : 'Não foi possível apagar. Tente de novo.',
      )
    }
  }

  function finalizar(id) {
    setErroDelete('')
    finalizarPerfume.mutate({ id, finalizar: true })
  }

  function reativar(id) {
    setErroDelete('')
    finalizarPerfume.mutate({ id, finalizar: false })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-ink">Perfumes</h1>
          <p className="mt-2 text-muted">Cada linha é um frasco físico do seu acervo.</p>
        </div>
        <Button onClick={() => setAberto((v) => !v)}>{aberto ? 'Fechar' : 'Novo perfume'}</Button>
      </div>

      {aberto && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="card mt-6 grid gap-4 p-6 sm:grid-cols-2"
          noValidate
        >
          <Input id="nome" label="Nome" error={errors.nome?.message} {...register('nome')} />
          <Input
            id="marca"
            label="Marca (opcional)"
            error={errors.marca?.message}
            {...register('marca')}
          />
          <Input
            id="volume_total_ml"
            label="Volume total (ml)"
            type="number"
            error={errors.volume_total_ml?.message}
            {...register('volume_total_ml')}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tamanho_apc_ml"
              className="text-xs font-medium uppercase tracking-wider text-muted"
            >
              Tamanho do APC
            </label>
            <select
              id="tamanho_apc_ml"
              className="h-11 rounded-lg border border-border bg-surface px-3.5 text-sm text-ink focus:border-gold"
              {...register('tamanho_apc_ml')}
            >
              <option value="">Selecione</option>
              <option value="30">30 ml</option>
              <option value="40">40 ml</option>
            </select>
            {errors.tamanho_apc_ml?.message && (
              <p className="text-xs text-danger">{errors.tamanho_apc_ml.message}</p>
            )}
          </div>
          <Input
            id="preco_custo_total"
            label="Custo total (R$)"
            inputMode="numeric"
            placeholder="0,00"
            error={errors.preco_custo_total?.message}
            {...comMascara(register('preco_custo_total'))}
          />
          <Input
            id="valor_venda_por_ml"
            label="Venda por ml (R$)"
            inputMode="numeric"
            placeholder="0,00"
            error={errors.valor_venda_por_ml?.message}
            {...comMascara(register('valor_venda_por_ml'))}
          />

          {addPerfume.isError && (
            <p className="text-sm text-danger sm:col-span-2" role="alert">
              Não foi possível salvar. Confira os dados e tente de novo.
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={addPerfume.isPending}>
              {addPerfume.isPending ? 'Salvando…' : 'Salvar perfume'}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-8">
        {erroDelete && (
          <p className="mb-3 text-sm text-danger" role="alert">
            {erroDelete}
          </p>
        )}
        {finalizarPerfume.isError && (
          <p className="mb-3 text-sm text-danger" role="alert">
            Não foi possível atualizar o perfume. Tente de novo.
          </p>
        )}
        {isPending ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : isError ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">Não foi possível carregar os perfumes.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-gold hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : perfumes.length === 0 ? (
          <div className="card p-10 text-center">
            <span className="text-3xl text-gold" aria-hidden="true">
              ✦
            </span>
            <h2 className="mt-3 font-serif text-2xl text-ink">Nenhum perfume ainda</h2>
            <p className="mt-1 text-sm text-muted">
              Cadastre o primeiro frasco do seu acervo para começar.
            </p>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => setAberto(true)}>Cadastrar perfume</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                <select
                  value={campoBusca}
                  onChange={(e) => setCampoBusca(e.target.value)}
                  aria-label="Buscar perfume por qual dado"
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-gold"
                >
                  <option value="nome">Nome</option>
                  <option value="marca">Marca</option>
                </select>
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={`Buscar por ${campoBusca}`}
                  aria-label={`Buscar perfume por ${campoBusca}`}
                  className="h-11 w-44 flex-1 rounded-lg border border-border bg-surface px-3.5 text-sm text-ink placeholder:text-muted/60 focus:border-gold"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted">Filtrar</span>
                <select
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  aria-label="Filtrar perfumes"
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-gold"
                >
                  <option value="todos">Todos</option>
                  <option value="nao_esgotado">Não esgotados</option>
                  <option value="esgotado">Esgotados</option>
                  <option value="apc_vendido">APC vendido</option>
                  <option value="apc_disponivel">APC disponível</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted">Ordenar</span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value)}
                  aria-label="Ordenar perfumes"
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-gold"
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="nome">Nome (A–Z)</option>
                  <option value="mais_livre">Mais ml livres</option>
                  <option value="menos_livre">Menos ml livres</option>
                </select>
              </div>
            </div>

            {perfumesOrdenados.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-muted">Nenhum perfume com esses filtros.</p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {perfumesOrdenados.map((p) => {
                  const finalizado = !!p.finalizado_em
                  const s = SITUACAO[p.situacao] ?? { label: p.situacao, cls: 'text-muted' }
                  const label = finalizado ? 'Finalizado' : s.label
                  const vendavel = p.pode_vender_decant || p.pode_vender_apc
                  return (
                    <li key={p.id} className="card flex items-center justify-between gap-4 p-5">
                      <div>
                        <p className="font-serif text-xl text-ink">{p.nome}</p>
                        <p className="text-sm text-muted">
                          {p.marca || 'Sem marca'} · {p.volume_total_ml}ml · APC {p.tamanho_apc_ml}ml
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            p.apc_vendido
                              ? 'bg-gold/15 text-gold'
                              : 'border border-border text-muted'
                          }`}
                        >
                          {p.apc_vendido ? '✓ APC vendido' : 'APC disponível'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-ink">{p.ml_livres_decants}ml livres</p>
                          <p className={`text-xs uppercase tracking-wider ${s.cls}`}>{label}</p>
                        </div>
                        <FinalizarButton
                          finalizado={finalizado}
                          vendavel={vendavel}
                          disabled={finalizarPerfume.isPending}
                          onFinalizar={() => finalizar(p.id)}
                          onReativar={() => reativar(p.id)}
                        />
                        <DeleteButton
                          onConfirm={() => apagarPerfume(p.id)}
                          disabled={deletePerfume.isPending}
                          label={`Apagar ${p.nome}`}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
