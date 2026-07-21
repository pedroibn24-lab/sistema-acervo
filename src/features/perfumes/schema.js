import { z } from 'zod'

/**
 * Converte dinheiro escrito no formato brasileiro para número.
 * Aceita "1.500,00", "200,50", "200.50" e "200". Quando há vírgula, ela é o
 * decimal e os pontos são separador de milhar; sem vírgula, o ponto vira decimal.
 * @param {unknown} v
 */
function parseDinheiro(v) {
  if (typeof v !== 'string') return v
  const s = v.trim()
  if (s === '') return undefined
  const normalizado = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Number(normalizado)
}

/** Campo de dinheiro: aceita o formato brasileiro e exige valor positivo. */
const dinheiro = (msg) =>
  z.preprocess(parseDinheiro, z.number({ invalid_type_error: 'Valor inválido' }).positive(msg))

/**
 * Schema do formulário de cadastro de perfume. Espelha (na tela) as regras que
 * o banco garante de verdade — validação em camadas.
 */
export const perfumeFormSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome'),
    marca: z.string().trim().optional(),
    volume_total_ml: z.coerce
      .number({ invalid_type_error: 'Número inválido' })
      .int('Use um número inteiro')
      .positive('Informe um volume válido'),
    tamanho_apc_ml: z.coerce
      .number()
      .refine((v) => v === 30 || v === 40, 'Escolha 30 ou 40'),
    preco_custo_total: dinheiro('Informe o custo'),
    valor_venda_por_ml: dinheiro('Informe o valor por ml'),
  })
  .refine((d) => d.tamanho_apc_ml < d.volume_total_ml, {
    message: 'O APC precisa ser menor que o volume total',
    path: ['tamanho_apc_ml'],
  })
