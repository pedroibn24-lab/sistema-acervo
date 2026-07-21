import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const CLIENTES_KEY = ['clientes']

/** Lista os clientes do usuário logado. */
export function useClientes() {
  return useQuery({
    queryKey: CLIENTES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, whatsapp, endereco, created_at')
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
        .insert({
          nome: values.nome,
          whatsapp: values.whatsapp,
          endereco: values.endereco || null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTES_KEY }),
  })
}

/** Apaga um cliente. O banco bloqueia (restrict) se já houver sacolinha ligada. */
export function useDeleteCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENTES_KEY }),
  })
}
