import { useRouteError, Link } from 'react-router'

/** Tela de fallback quando uma rota quebra (error boundary por rota). */
export default function RouteError() {
  const error = useRouteError()
  // Detalhe só no console (para depurar); ao usuário, mensagem genérica.
  console.error(error)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-3xl text-gold" aria-hidden="true">
        ✦
      </span>
      <h1 className="font-serif text-2xl text-ink">Algo saiu do lugar</h1>
      <p className="text-sm text-muted">
        Encontramos um problema ao abrir esta tela. Tente novamente em instantes.
      </p>
      <Link to="/" className="text-sm font-medium text-gold hover:underline">
        Voltar ao início
      </Link>
    </div>
  )
}
