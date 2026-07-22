import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Separa as bibliotecas grandes em pedaços próprios, em vez de um
        // arquivão único. Recebe o caminho de cada módulo e devolve o nome do
        // pedaço em que ele deve entrar.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('@tanstack')
          ) {
            return 'vendor'
          }
        },
      },
    },
  },
})
