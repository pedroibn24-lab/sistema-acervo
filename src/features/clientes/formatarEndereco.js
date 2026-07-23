/**
 * Monta o endereço do cliente numa linha só, a partir dos campos separados.
 * Pula o que estiver vazio. Ex.: "Rua X, 123 · Ap 2 · Centro · São Paulo/SP · 01000-000".
 * @param {{ rua?: string|null, numero?: string|null, complemento?: string|null,
 *           bairro?: string|null, cidade?: string|null, estado?: string|null,
 *           cep?: string|null } | null | undefined} c
 * @returns {string}
 */
export function formatarEndereco(c) {
  if (!c) return ''
  const ruaNumero = [c.rua, c.numero].filter(Boolean).join(', ')
  const cidadeUf = [c.cidade, c.estado].filter(Boolean).join('/')
  return [ruaNumero, c.complemento, c.bairro, cidadeUf, c.cep].filter(Boolean).join(' · ')
}
