import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/AuthProvider'
import RequireAuth from './components/RequireAuth'
import Login from './routes/Login'
import AppLayout from './components/AppLayout'
import RouteError from './components/RouteError'

// Cada tela vira um "pedaço" separado, baixado só quando o usuário entra nela.
// (O Login fica junto do começo porque é a primeira coisa que todo mundo vê.)
const Dashboard = lazy(() => import('./routes/Dashboard'))
const Vendas = lazy(() => import('./routes/Vendas'))
const Perfumes = lazy(() => import('./routes/Perfumes'))
const Clientes = lazy(() => import('./routes/Clientes'))
const ClienteDetalhe = lazy(() => import('./routes/ClienteDetalhe'))
const Estoque = lazy(() => import('./routes/Estoque'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

const router = createBrowserRouter([
  { path: '/', element: <Login />, errorElement: <RouteError /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/vendas', element: <Vendas /> },
      { path: '/perfumes', element: <Perfumes /> },
      { path: '/clientes', element: <Clientes /> },
      { path: '/clientes/:id', element: <ClienteDetalhe /> },
      { path: '/estoque', element: <Estoque /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
