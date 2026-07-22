import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Posição de caixa (view vw_caixa): recebido − investido nos frascos.
 * Fica negativo enquanto você não recuperou o que gastou comprando.
 */
export function useCaixa() {
  return useQuery({
    queryKey: ['caixa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_caixa')
        .select('investido, recebido, caixa')
        .single()
      if (error) throw error
      return data
    },
  })
}
