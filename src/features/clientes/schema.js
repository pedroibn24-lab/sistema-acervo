import { z } from 'zod'

/** Schema do formulário de cadastro de cliente. */
export const clienteFormSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome'),
  whatsapp: z.string().trim().min(1, 'Informe o WhatsApp'),
  endereco: z.string().trim().optional(),
})
