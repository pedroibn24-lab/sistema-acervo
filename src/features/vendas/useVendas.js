import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/** Resumo da sacolinha ABERTA de um cliente (ou null se não tem). */
export function useSacolinhaAberta(clienteId) {
  return useQuery({
    queryKey: ['sacolinha', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_sacolinhas_resumo')
        .select(
          'id, qtd_decants, frascos_5ml, frascos_20ml, caixas_coletivas_sugeridas, caixas_individuais_sugeridas, valor_itens, status_envio',
        )
        .eq('cliente_id', clienteId)
        .neq('status_envio', 'enviado')
        .maybeSingle()
      if (error) throw error
      return data // pode ser null
    },
  })
}

/** Itens (decants) de uma sacolinha, com o nome do perfume embutido. */
export function useItensSacolinha(sacolinhaId) {
  return useQuery({
    queryKey: ['itens-sacolinha', sacolinhaId],
    enabled: !!sacolinhaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas_itens')
        .select('id, tipo, ml, frasco_ml, preco_venda, status_pagamento_perfume, perfumes(nome)')
        .eq('sacolinha_id', sacolinhaId)
        .order('created_at', { ascending: false })
        .range(0, 99)
      if (error) throw error
      return data
    },
  })
}

/**
 * Vende um decant: acha (ou cria) a sacolinha aberta do cliente e insere o item.
 * A TRAVA DO APC é checada pelo banco no INSERT — se estourar, o erro vem com a
 * mensagem "TRAVA DO APC: ...", que a tela mostra ao usuário.
 */
export function useVenderDecant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ clienteId, perfumeId, ml }) => {
      // 1. acha a sacolinha aberta do cliente
      const { data: existente, error: e1 } = await supabase
        .from('sacolinhas')
        .select('id')
        .eq('cliente_id', clienteId)
        .neq('status_envio', 'enviado')
        .maybeSingle()
      if (e1) throw e1

      let sacolinhaId = existente?.id
      // 2. se não tem, cria uma
      if (!sacolinhaId) {
        const { data: nova, error: e2 } = await supabase
          .from('sacolinhas')
          .insert({ cliente_id: clienteId })
          .select('id')
          .single()
        if (e2) throw e2
        sacolinhaId = nova.id
      }

      // 3. registra a venda (o banco valida a trava e debita o estoque)
      const { error: e3 } = await supabase
        .from('vendas_itens')
        .insert({ sacolinha_id: sacolinhaId, perfume_id: perfumeId, tipo: 'decant', ml })
      if (e3) throw e3

      return { sacolinhaId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sacolinha'] })
      queryClient.invalidateQueries({ queryKey: ['itens-sacolinha'] })
      queryClient.invalidateQueries({ queryKey: ['perfumes'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}

/**
 * Apaga um item de venda. Isso aciona o ESTORNO no banco (trigger AFTER DELETE):
 * o saldo do perfume volta e o frasco retorna ao estoque, automaticamente.
 */
export function useApagarItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('vendas_itens').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sacolinha'] })
      queryClient.invalidateQueries({ queryKey: ['itens-sacolinha'] })
      queryClient.invalidateQueries({ queryKey: ['perfumes'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}

/** Marca o pagamento do perfume de um item como pago ou pendente. */
export function useMarcarPagoPerfume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pago }) => {
      const { error } = await supabase
        .from('vendas_itens')
        .update({ status_pagamento_perfume: pago ? 'pago' : 'pendente' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-sacolinha'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro'] })
    },
  })
}
