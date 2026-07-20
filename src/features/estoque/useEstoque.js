import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const ESTOQUE_KEY = ['estoque']

/** Lê o estoque e devolve um mapa { tipo: quantidade }. */
export function useEstoque() {
  return useQuery({
    queryKey: ESTOQUE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('estoque_insumos').select('tipo, quantidade')
      if (error) throw error
      const mapa = {}
      for (const row of data) mapa[row.tipo] = row.quantidade
      return mapa
    },
  })
}

/** Define a quantidade de um insumo (cria a linha se não existir). */
export function useSetEstoque() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tipo, quantidade }) => {
      // upsert: se já existe a linha (owner_id, tipo), atualiza; senão, cria.
      const { error } = await supabase
        .from('estoque_insumos')
        .upsert({ tipo, quantidade }, { onConflict: 'owner_id,tipo' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ESTOQUE_KEY }),
  })
}
