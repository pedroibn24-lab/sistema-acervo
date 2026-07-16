import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const PERFUMES_KEY = ['perfumes']

/** Lista os perfumes com saldo e situação (view vw_perfumes_saldo). */
export function usePerfumes() {
  return useQuery({
    queryKey: PERFUMES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_perfumes_saldo')
        .select(
          'id, nome, marca, volume_total_ml, tamanho_apc_ml, ml_vendidos_decants, ml_livres_decants, apc_ml_atual, situacao',
        )
        .order('created_at', { ascending: false })
        .range(0, 49)
      if (error) throw error
      return data
    },
  })
}

/** Cadastra um perfume (1 linha = 1 frasco físico). owner_id vem do auth.uid(). */
export function useAddPerfume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('perfumes')
        .insert({
          nome: values.nome,
          marca: values.marca || null,
          // Number() garante que vão como número, não texto (blindagem).
          volume_total_ml: Number(values.volume_total_ml),
          tamanho_apc_ml: Number(values.tamanho_apc_ml),
          preco_custo_total: Number(values.preco_custo_total),
          valor_venda_por_ml: Number(values.valor_venda_por_ml),
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERFUMES_KEY })
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}
