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

/**
 * Adiciona `delta` frascos ao estoque de um tipo (soma em cima do que já existe).
 * `delta` negativo REMOVE do estoque — nunca fica abaixo de 0 (Math.max(0, ...)).
 * Lê o valor atual, soma e grava o novo total. Cria a linha se ainda não houver.
 */
export function useAddEstoque() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tipo, delta }) => {
      // 1. lê o que já tem no estoque desse tipo (null = ainda não existe a linha)
      const { data: atual, error: e1 } = await supabase
        .from('estoque_insumos')
        .select('quantidade')
        .eq('tipo', tipo)
        .maybeSingle()
      if (e1) throw e1

      // 2. soma o que foi adicionado (nunca deixa negativo)
      const novaQtd = Math.max(0, (atual?.quantidade ?? 0) + delta)

      // 3. grava: se já existe a linha (owner_id, tipo), atualiza; senão, cria.
      const { error: e2 } = await supabase
        .from('estoque_insumos')
        .upsert({ tipo, quantidade: novaQtd }, { onConflict: 'owner_id,tipo' })
      if (e2) throw e2
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ESTOQUE_KEY }),
  })
}
