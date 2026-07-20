import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useClientes, useAddCliente } from '../features/clientes/useClientes'
import { clienteFormSchema } from '../features/clientes/schema'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

/** Tela de clientes: cadastro + lista. */
export default function Clientes() {
  const [aberto, setAberto] = useState(false)
  const { data: clientes, isPending, isError, refetch } = useClientes()
  const addCliente = useAddCliente()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: { nome: '', whatsapp: '', endereco: '' },
  })

  async function onSubmit(values) {
    await addCliente.mutateAsync(values)
    reset()
    setAberto(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl leading-tight text-ink">Clientes</h1>
          <p className="mt-2 text-muted">Quem compra os decants do seu acervo.</p>
        </div>
        <Button onClick={() => setAberto((v) => !v)}>{aberto ? 'Fechar' : 'Novo cliente'}</Button>
      </div>

      {aberto && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="card mt-6 grid gap-4 p-6 sm:grid-cols-2"
          noValidate
        >
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

          {addCliente.isError && (
            <p className="text-sm text-danger sm:col-span-2" role="alert">
              Não foi possível salvar. Confira os dados (o WhatsApp não pode repetir) e tente de novo.
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={addCliente.isPending}>
              {addCliente.isPending ? 'Salvando…' : 'Salvar cliente'}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-8">
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
              <Button onClick={() => setAberto(true)}>Cadastrar cliente</Button>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3">
            {clientes.map((c) => (
              <li key={c.id} className="card flex items-center justify-between p-5">
                <div>
                  <p className="font-serif text-xl text-ink">{c.nome}</p>
                  <p className="text-sm text-muted">
                    {c.whatsapp}
                    {c.endereco ? ` · ${c.endereco}` : ''}
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
