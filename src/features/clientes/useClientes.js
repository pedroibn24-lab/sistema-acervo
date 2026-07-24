import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const CLIENTES_KEY = ['clientes']

// Colunas do endereço + dados base. Usado nas leituras e para montar o payload.
const CAMPOS_CLIENTE = 'nome, whatsapp, cep, rua, numero, complemento, bairro, cidade, estado'

/** Monta o objeto pra gravar: campos vazios viram null. */
function dadosCliente(values) {
  const limpar = (v) => (v && String(v).trim() ? String(v).trim() : null)
  return {
    nome: values.nome,
    whatsapp: values.whatsapp,
    cep: limpar(values.cep),
    rua: limpar(values.rua),
    numero: limpar(values.numero),
    complemento: limpar(values.complemento),
    bairro: limpar(values.bairro),
    cidade: limpar(values.cidade),
    estado: limpar(values.estado),
  }
}

/** Lista os clientes do usuário logado. */
export function useClientes() {
  return useQuery({
    queryKey: CLIENTES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select(`id, ${CAMPOS_CLIENTE}, created_at`)
        .order('nome', { ascending: true })
        .range(0, 99)
      if (error) throw error
      return data
    },
  })
}

/** Cadastra um cliente novo. owner_id vem do auth.uid(). */
export function useAddCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert(dadosCliente(values))
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTES_KEY }),
  })
}

/** Edita os dados de um cliente. */
export function useUpdateCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }) => {
      const { error } = await supabase.from('clientes').update(dadosCliente(values)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTES_KEY }),
  })
}

/**
 * Apaga um cliente — mas só se ele não tiver NENHUM decant (pago ou pendente).
 * Antes, limpa as sacolinhas VAZIAS (sem item). Se sobrar sacolinha com venda,
 * o banco bloqueia (restrict) e o erro sobe pra tela avisar.
 */
export function useDeleteCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      // 1. sacolinhas do cliente
      const { data: sacs, error: e1 } = await supabase
        .from('sacolinhas')
        .select('id')
        .eq('cliente_id', id)
      if (e1) throw e1
      const sacIds = (sacs ?? []).map((s) => s.id)

      // 2. quais dessas têm algum item (decant ou APC)?
      if (sacIds.length) {
        const { data: comItens, error: e2 } = await supabase
          .from('vendas_itens')
          .select('sacolinha_id')
          .in('sacolinha_id', sacIds)
        if (e2) throw e2
        const ocupadas = new Set((comItens ?? []).map((r) => r.sacolinha_id))
        const vazias = sacIds.filter((sid) => !ocupadas.has(sid))
        // 3. apaga só as sacolinhas VAZIAS
        if (vazias.length) {
          const { error: e3 } = await supabase.from('sacolinhas').delete().in('id', vazias)
          if (e3) throw e3
        }
      }

      // 4. apaga o cliente (o banco bloqueia se ainda houver sacolinha com venda)
      const { error: e4 } = await supabase.from('clientes').delete().eq('id', id)
      if (e4) throw e4
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTES_KEY }),
  })
}

/** Busca um cliente pelo id (para a tela de detalhe). */
export function useCliente(id) {
  return useQuery({
    queryKey: ['cliente', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select(`id, ${CAMPOS_CLIENTE}`)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

/**
 * Histórico do cliente agrupado por SACOLINHA, com os itens de cada uma dentro.
 * Cada sacolinha é um "pedido"; a mais recente primeiro. A em aberto (não enviada)
 * vem junto, marcada pelo status_envio.
 */
export function useSacolinhasCliente(clienteId) {
  return useQuery({
    queryKey: ['sacolinhas-cliente', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sacolinhas')
        .select(
          'id, status_envio, valor_frete, frete_pago, created_at, enviado_em, vendas_itens(id, tipo, ml, preco_venda, status_pagamento_perfume, perfumes(nome))',
        )
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .range(0, 99)
      if (error) throw error
      return data
    },
  })
}
