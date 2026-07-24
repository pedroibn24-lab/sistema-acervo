// Recebe o redirecionamento do OAuth do Melhor Envio, troca o "code" pelo token
// e guarda na tabela melhor_envio_tokens. Roda no servidor do Supabase.
//
// Deploy com --no-verify-jwt (o Melhor Envio chama esta URL sem token do Supabase):
//   npx supabase functions deploy melhor-envio-callback --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BASE_URL = Deno.env.get('MELHOR_ENVIO_BASE_URL')!
const CLIENT_ID = Deno.env.get('MELHOR_ENVIO_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('MELHOR_ENVIO_CLIENT_SECRET')!
const REDIRECT_URI = Deno.env.get('MELHOR_ENVIO_REDIRECT_URI')!
const USER_AGENT = Deno.env.get('MELHOR_ENVIO_USER_AGENT') ?? 'Sistema Acervo'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function pagina(msg: string, status = 200) {
  return new Response(msg, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return pagina('Faltou o "code" na autorização.', 400)

  // Troca o code por access_token + refresh_token.
  const resp = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }),
  })

  const data = await resp.json().catch(() => null)
  if (!resp.ok || !data?.access_token) {
    return pagina(`Erro ao obter o token: ${JSON.stringify(data)}`, 500)
  }

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 0) * 1000).toISOString()

  const { error } = await supabase.from('melhor_envio_tokens').upsert({
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })

  if (error) return pagina(`Erro ao salvar o token: ${error.message}`, 500)

  return pagina('Melhor Envio conectado com sucesso! Pode fechar esta aba. ✅')
})
