import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/** Resumo financeiro (view vw_financeiro): faturamento e lucro agregados. */
export function useFinanceiro() {
  return useQuery({
    queryKey: ['financeiro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_financeiro')
        .select('faturamento_bruto, lucro_liquido, decants_vendidos, apcs_vendidos')
        .single()
      if (error) throw error
      return data
    },
  })
}
