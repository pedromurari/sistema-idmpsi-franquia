import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DreUnidade from '@/pages/DreUnidade';
import NotasFiscais from '@/pages/NotasFiscais';
import Unidades from '@/pages/Unidades';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

function ProtectedRoute({ children, somenteFranqueador = false }: { children: React.ReactNode; somenteFranqueador?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (somenteFranqueador && user.role !== 'franqueador') return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={loading ? null : user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/unidades" element={<ProtectedRoute somenteFranqueador><Unidades /></ProtectedRoute>} />
      <Route path="/dre" element={<ProtectedRoute><DreUnidade /></ProtectedRoute>} />
      <Route path="/notas" element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
