import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Clientes com pagamento pendente (view vw_devedores), do que mais deve para o
 * que menos deve. Cada linha traz nome, whatsapp, quantos itens e o total devido.
 */
export function useDevedores() {
  return useQuery({
    queryKey: ['devedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_devedores')
        .select('cliente_id, nome, whatsapp, itens_pendentes, total_devido')
        .range(0, 99)
      if (error) throw error
      return data
    },
  })
}
