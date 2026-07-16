import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/AuthContext'
import RequireAuth from './components/RequireAuth'
import Login from './routes/Login'
import Dashboard from './routes/Dashboard'
import Perfumes from './routes/Perfumes'
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
