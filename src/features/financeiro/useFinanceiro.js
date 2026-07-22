import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/** Resumo financeiro (view vw_financeiro): faturamento e lucro agregados. */
export function useFinanceiro() {
  return useQuery({
    queryKey: ['financeiro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_financeiro')
        .select('faturamento_bruto, faturamento_recebido, a_receber')
        .single()
      if (error) throw error
      return data
    },
  })
}
