import { useState } from 'react'
import { Navigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import Brand from '../components/Brand'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import ThemeToggle from '../components/ThemeToggle'

const schema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
})

/** Tela de login com autenticação real no Supabase. */
export default function Login() {
  const { session } = useAuth()
  const [erroGeral, setErroGeral] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', senha: '' } })

  // Logado? Sai do login. Como reage à sessão (e não a um navigate manual),
  // não há corrida: assim que o Supabase confirma o login, isto redireciona.
  if (session) return <Navigate to="/dashboard" replace />

  /** @param {{ email: string, senha: string }} values */
  async function onSubmit(values) {
    setErroGeral('')
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.senha,
    })
    if (error) {
      // Mensagem genérica ao usuário; o detalhe fica no SDK.
      setErroGeral('E-mail ou senha inválidos.')
    }
    // Sucesso: a sessão atualiza e o <Navigate> acima assume o redirecionamento.
  }

  return (
    <div className="relative min-h-dvh bg-bg text-ink">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <div className="flex justify-center">
            <Brand />
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">
            Decants Exclusivos · Nicho
          </p>
        </div>

        <div className="card p-8">
          <h1 className="font-serif text-3xl leading-tight text-ink">Entrar</h1>
          <p className="mt-1 text-sm text-muted">Acesse o painel de gestão do acervo.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-4" noValidate>
            <Input
              id="email"
              label="E-mail"
              type="email"
              placeholder="voce@acervoraro.com.br"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="senha"
              label="Senha"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.senha?.message}
              {...register('senha')}
            />

            {erroGeral && (
              <p className="text-sm text-danger" role="alert">
                {erroGeral}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Exclusividade é memória. Acervo é legado.
        </p>
      </div>
    </div>
  )
}
