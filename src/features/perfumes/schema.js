import { z } from 'zod'

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
    preco_custo_total: z.coerce
      .number({ invalid_type_error: 'Número inválido' })
      .positive('Informe o custo'),
    valor_venda_por_ml: z.coerce
      .number({ invalid_type_error: 'Número inválido' })
      .positive('Informe o valor por ml'),
  })
  .refine((d) => d.tamanho_apc_ml < d.volume_total_ml, {
    message: 'O APC precisa ser menor que o volume total',
    path: ['tamanho_apc_ml'],
  })
