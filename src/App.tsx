import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ViewAsProvider, useViewAs } from '@/contexts/ViewAsContext';
import { Layout } from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DreUnidade from '@/pages/DreUnidade';
import NotasFiscais from '@/pages/NotasFiscais';
import Unidades from '@/pages/Unidades';
import Turmas from '@/pages/Turmas';
import Comercial from '@/pages/Comercial';
import ExpansaoFranquias from '@/pages/ExpansaoFranquias';
import CapturaFranquia from '@/pages/CapturaFranquia';
import SocialMidia from '@/pages/SocialMidia';
import Sugestoes from '@/pages/Sugestoes';
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

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user?.role === 'franqueador' ? '/rede' : '/dashboard'} replace />;
}

function PainelUnidade() {
  const { user } = useAuth();
  const { franquiaEfetiva } = useViewAs();
  if (user?.role === 'franqueador' && !franquiaEfetiva) return <Navigate to="/unidades" replace />;
  return <Dashboard escopo="unidade" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={loading ? null : user ? <HomeRedirect /> : <Login />} />
      <Route path="/quero-ser-franqueado" element={<CapturaFranquia />} />
      <Route path="/rede" element={<ProtectedRoute somenteFranqueador><Dashboard escopo="rede" /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><PainelUnidade /></ProtectedRoute>} />
      <Route path="/unidades" element={<ProtectedRoute somenteFranqueador><Unidades /></ProtectedRoute>} />
      <Route path="/dre" element={<ProtectedRoute><DreUnidade /></ProtectedRoute>} />
      <Route path="/turmas" element={<ProtectedRoute><Turmas /></ProtectedRoute>} />
      <Route path="/comercial" element={<ProtectedRoute><Comercial /></ProtectedRoute>} />
      <Route path="/expansao" element={<ProtectedRoute somenteFranqueador><ExpansaoFranquias /></ProtectedRoute>} />
      <Route path="/social-franqueadora" element={<ProtectedRoute somenteFranqueador><SocialMidia escopo="franqueadora" /></ProtectedRoute>} />
      <Route path="/sugestoes" element={<ProtectedRoute somenteFranqueador><Sugestoes /></ProtectedRoute>} />
      <Route path="/social-unidade" element={<ProtectedRoute><SocialMidia escopo="unidade" /></ProtectedRoute>} />
      <Route path="/notas" element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ViewAsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </ViewAsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
