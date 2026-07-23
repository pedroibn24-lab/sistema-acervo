import { z } from 'zod'

/** Schema do formulário de cadastro de cliente. Endereço é obrigatório (menos o complemento). */
export const clienteFormSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome'),
  whatsapp: z
    .string()
    .trim()
    .min(1, 'Informe o WhatsApp')
    .refine((v) => v.replace(/\D/g, '').length === 11, 'WhatsApp incompleto — DDD + 9 dígitos'),
  cep: z
    .string()
    .trim()
    .min(1, 'Informe o CEP')
    .refine((v) => v.replace(/\D/g, '').length === 8, 'CEP incompleto'),
  rua: z.string().trim().min(1, 'Informe a rua'),
  numero: z.string().trim().min(1, 'Informe o número'),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().min(1, 'Informe o bairro'),
  cidade: z.string().trim().min(1, 'Informe a cidade'),
  estado: z.string().trim().min(1, 'Informe o estado').max(2, 'UF tem 2 letras'),
})
