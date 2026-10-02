import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
