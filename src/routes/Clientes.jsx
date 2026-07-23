import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useClientes,
  useAddCliente,
  useUpdateCliente,
  useDeleteCliente,
} from '../features/clientes/useClientes'
import { clienteFormSchema } from '../features/clientes/schema'
import { formatarEndereco } from '../features/clientes/formatarEndereco'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import DeleteButton from '../components/ui/DeleteButton'

/** Valores em branco do formulário (usados ao abrir "novo"). */
const VAZIO = {
  nome: '',
  whatsapp: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
}

/**
 * Formata um telefone brasileiro (celular) enquanto digita: "(11) 99999-9999".
 * Mantém só os dígitos (máx. 11) e vai montando os parênteses, espaço e traço.
 * @param {string} valor
 */
function mascaraTelefone(valor) {
  const d = String(valor).replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Formata o CEP enquanto digita: "01000000" -> "01000-000". */
function mascaraCep(valor) {
  const d = String(valor).replace(/\D/g, '').slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

/** Tela de clientes: cadastrar, editar, listar e apagar. */
export default function Clientes() {
  const [aberto, setAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [erroDelete, setErroDelete] = useState('')
  const [busca, setBusca] = useState('')
  const [campoBusca, setCampoBusca] = useState('nome') // 'nome' ou 'telefone'
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erroCep, setErroCep] = useState('')
  const { data: clientes, isPending, isError, refetch } = useClientes()
  const addCliente = useAddCliente()
  const updateCliente = useUpdateCliente()
  const deleteCliente = useDeleteCliente()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: VAZIO,
  })

  const salvando = addCliente.isPending || updateCliente.isPending
  const erroSalvar = addCliente.isError || updateCliente.isError

  /**
   * Consulta o ViaCEP (API pública e gratuita) e preenche rua, bairro, cidade e
   * estado. Os campos continuam editáveis — dá pra corrigir na mão depois.
   */
  async function buscarCep(cepDigitos) {
    setErroCep('')
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigitos}/json/`)
      const data = await res.json()
      if (data.erro) {
        setErroCep('CEP não encontrado — preencha na mão.')
        return
      }
      setValue('rua', data.logradouro || '')
      setValue('bairro', data.bairro || '')
      setValue('cidade', data.localidade || '')
      setValue('estado', data.uf || '')
    } catch {
      setErroCep('Não foi possível buscar o CEP agora.')
    } finally {
      setBuscandoCep(false)
    }
  }

  /** onChange do CEP: aplica a máscara e, ao completar 8 dígitos, busca. */
  function aoDigitarCep(e) {
    const mascarado = mascaraCep(e.target.value)
    e.target.value = mascarado
    const digitos = mascarado.replace(/\D/g, '')
    if (digitos.length === 8) buscarCep(digitos)
    else setErroCep('')
  }

  // Filtra pelo campo escolhido. No telefone, compara só os dígitos, pra a
  // pontuação (parênteses, traço, espaço) não atrapalhar a busca.
  const termo = busca.trim().toLowerCase()
  const clientesFiltrados = (clientes ?? []).filter((c) => {
    if (!termo) return true
    if (campoBusca === 'telefone') {
      const digitos = termo.replace(/\D/g, '')
      return digitos !== '' && c.whatsapp.replace(/\D/g, '').includes(digitos)
    }
    return c.nome.toLowerCase().includes(termo)
  })

  function abrirNovo() {
    setEditandoId(null)
    setErroCep('')
    addCliente.reset()
    updateCliente.reset()
    reset(VAZIO)
    setAberto(true)
  }

  function abrirEdicao(c) {
    setEditandoId(c.id)
    setErroCep('')
    addCliente.reset()
    updateCliente.reset()
    reset({
      nome: c.nome,
      whatsapp: c.whatsapp,
      cep: c.cep || '',
      rua: c.rua || '',
      numero: c.numero || '',
      complemento: c.complemento || '',
      bairro: c.bairro || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
    })
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setEditandoId(null)
  }

  async function onSubmit(values) {
    if (editandoId) {
      await updateCliente.mutateAsync({ id: editandoId, values })
    } else {
      await addCliente.mutateAsync(values)
    }
    reset()
    fechar()
  }

  async function apagarCliente(id) {
    setErroDelete('')
    try {
      await deleteCliente.mutateAsync(id)
    } catch (err) {
      setErroDelete(
        err?.code === '23503'
          ? 'Não dá pra apagar: este cliente tem decants na sacolinha ou no histórico.'
          : 'Não foi possível apagar. Tente de novo.',
      )
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-ink">Clientes</h1>
          <p className="mt-2 text-muted">Quem compra os decants do seu acervo.</p>
        </div>
        <Button onClick={() => (aberto ? fechar() : abrirNovo())}>
          {aberto ? 'Fechar' : 'Novo cliente'}
        </Button>
      </div>

      {aberto && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="card mt-6 grid gap-4 p-6 sm:grid-cols-2"
          noValidate
        >
          <p className="font-serif text-xl text-ink sm:col-span-2">
            {editandoId ? 'Editar cliente' : 'Novo cliente'}
          </p>
          <Input id="nome" label="Nome" error={errors.nome?.message} {...register('nome')} />
          <Input
            id="whatsapp"
            label="WhatsApp"
            inputMode="numeric"
            placeholder="(11) 99999-9999"
            error={errors.whatsapp?.message}
            {...register('whatsapp', {
              onChange: (e) => {
                e.target.value = mascaraTelefone(e.target.value)
              },
            })}
          />
          <p className="mt-2 font-serif text-lg text-ink sm:col-span-2">Endereço</p>

          <div>
            <Input
              id="cep"
              label="CEP"
              inputMode="numeric"
              placeholder="00000-000"
              error={errors.cep?.message}
              {...register('cep', { onChange: aoDigitarCep })}
            />
            {buscandoCep && <p className="mt-1 text-xs text-muted">Buscando endereço…</p>}
            {erroCep && <p className="mt-1 text-xs text-danger">{erroCep}</p>}
          </div>
          <Input id="numero" label="Número" error={errors.numero?.message} {...register('numero')} />

          <div className="sm:col-span-2">
            <Input id="rua" label="Rua" error={errors.rua?.message} {...register('rua')} />
          </div>
          <div className="sm:col-span-2">
            <Input
              id="complemento"
              label="Complemento (opcional)"
              error={errors.complemento?.message}
              {...register('complemento')}
            />
          </div>

          <Input id="bairro" label="Bairro" error={errors.bairro?.message} {...register('bairro')} />
          <Input id="cidade" label="Cidade" error={errors.cidade?.message} {...register('cidade')} />
          <div className="sm:col-span-2 sm:max-w-[8rem]">
            <Input
              id="estado"
              label="Estado (UF)"
              maxLength={2}
              placeholder="SP"
              error={errors.estado?.message}
              {...register('estado')}
            />
          </div>

          {erroSalvar && (
            <p className="text-sm text-danger sm:col-span-2" role="alert">
              Não foi possível salvar. Confira os dados (o WhatsApp não pode repetir) e tente de novo.
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Salvar cliente'}
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
        {isPending ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : isError ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">Não foi possível carregar os clientes.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-gold hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : clientes.length === 0 ? (
          <div className="card p-10 text-center">
            <span className="text-3xl text-gold" aria-hidden="true">
              ✦
            </span>
            <h2 className="mt-3 font-serif text-2xl text-ink">Nenhum cliente ainda</h2>
            <p className="mt-1 text-sm text-muted">
              Cadastre o primeiro cliente pra começar a vender.
            </p>
            <div className="mt-4 flex justify-center">
              <Button onClick={abrirNovo}>Cadastrar cliente</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={campoBusca}
                onChange={(e) => setCampoBusca(e.target.value)}
                aria-label="Buscar cliente por qual dado"
                className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-gold"
              >
                <option value="nome">Nome</option>
                <option value="telefone">Telefone</option>
              </select>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Buscar por ${campoBusca}`}
                aria-label={`Buscar cliente por ${campoBusca}`}
                className="h-11 w-full max-w-xs flex-1 rounded-lg border border-border bg-surface px-3.5 text-sm text-ink placeholder:text-muted/60 focus:border-gold"
              />
            </div>

            {clientesFiltrados.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-muted">
                  Nenhum cliente encontrado para “{busca.trim()}”.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {clientesFiltrados.map((c) => (
                  <li key={c.id} className="card flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-serif text-xl text-ink">{c.nome}</p>
                      <p className="text-sm text-muted">
                        {c.whatsapp}
                        {formatarEndereco(c) ? ` · ${formatarEndereco(c)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/clientes/${c.id}`}
                        className="text-sm font-medium text-gold hover:underline"
                      >
                        Ver compras
                      </Link>
                      <button
                        type="button"
                        onClick={() => abrirEdicao(c)}
                        className="text-sm font-medium text-gold hover:underline"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        onConfirm={() => apagarCliente(c.id)}
                        disabled={deleteCliente.isPending}
                        label={`Apagar ${c.nome}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
