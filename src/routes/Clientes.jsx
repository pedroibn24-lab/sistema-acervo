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
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import DeleteButton from '../components/ui/DeleteButton'

/** Tela de clientes: cadastrar, editar, listar e apagar. */
export default function Clientes() {
  const [aberto, setAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [erroDelete, setErroDelete] = useState('')
  const { data: clientes, isPending, isError, refetch } = useClientes()
  const addCliente = useAddCliente()
  const updateCliente = useUpdateCliente()
  const deleteCliente = useDeleteCliente()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: { nome: '', whatsapp: '', endereco: '' },
  })

  const salvando = addCliente.isPending || updateCliente.isPending
  const erroSalvar = addCliente.isError || updateCliente.isError

  function abrirNovo() {
    setEditandoId(null)
    addCliente.reset()
    updateCliente.reset()
    reset({ nome: '', whatsapp: '', endereco: '' })
    setAberto(true)
  }

  function abrirEdicao(c) {
    setEditandoId(c.id)
    addCliente.reset()
    updateCliente.reset()
    reset({ nome: c.nome, whatsapp: c.whatsapp, endereco: c.endereco || '' })
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
            error={errors.whatsapp?.message}
            {...register('whatsapp')}
          />
          <div className="sm:col-span-2">
            <Input
              id="endereco"
              label="Endereço (opcional)"
              error={errors.endereco?.message}
              {...register('endereco')}
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
          <ul className="grid gap-3">
            {clientes.map((c) => (
              <li key={c.id} className="card flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-serif text-xl text-ink">{c.nome}</p>
                  <p className="text-sm text-muted">
                    {c.whatsapp}
                    {c.endereco ? ` · ${c.endereco}` : ''}
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
      </div>
    </div>
  )
}
