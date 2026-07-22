import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Números de operação para o Painel:
 * - sacolinhasAbertas: pedidos ainda não enviados.
 * - decantsAPagar: decants com pagamento pendente.
 * - apcsAPagar: APCs com pagamento pendente.
 * Usa contagem no banco (head: true traz só o total, sem os dados).
 */
export function useResumoOperacao() {
  return useQuery({
    queryKey: ['resumo-operacao'],
    queryFn: async () => {
      const { count: sacolinhasAbertas, error: e1 } = await supabase
        .from('sacolinhas')
        .select('id', { count: 'exact', head: true })
        .neq('status_envio', 'enviado')
      if (e1) throw e1

      const { count: decantsAPagar, error: e2 } = await supabase
        .from('vendas_itens')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'decant')
        .eq('status_pagamento_perfume', 'pendente')
      if (e2) throw e2

      const { count: apcsAPagar, error: e3 } = await supabase
        .from('vendas_itens')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'apc')
        .eq('status_pagamento_perfume', 'pendente')
      if (e3) throw e3

      return {
        sacolinhasAbertas: sacolinhasAbertas ?? 0,
        decantsAPagar: decantsAPagar ?? 0,
        apcsAPagar: apcsAPagar ?? 0,
      }
    },
  })
}
