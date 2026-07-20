import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/AuthProvider'
import RequireAuth from './components/RequireAuth'
import Login from './routes/Login'
import Dashboard from './routes/Dashboard'
import Perfumes from './routes/Perfumes'
import Clientes from './routes/Clientes'
import Estoque from './routes/Estoque'
import AppLayout from './components/AppLayout'
import RouteError from './components/RouteError'

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
      { path: '/perfumes', element: <Perfumes /> },
      { path: '/clientes', element: <Clientes /> },
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
