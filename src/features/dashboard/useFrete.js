import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/** Total de frete ainda não pago pelos clientes (view vw_frete). */
export function useFrete() {
  return useQuery({
    queryKey: ['frete'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_frete').select('a_receber_frete').single()
      if (error) throw error
      return data
    },
  })
}
