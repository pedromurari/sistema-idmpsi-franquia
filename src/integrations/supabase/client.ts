import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Falha alto e cedo -- melhor quebrar a tela de login com um erro claro do
  // que deixar o app meio-funcional tentando falar com "undefined".
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Copie .env.example para .env e preencha com o projeto Supabase da franqueadora.'
  );
}

// IMPORTANTE: este projeto usa a chave `anon` (pública, segura pro navegador) --
// nunca a `service_role`. Todo o isolamento entre franqueados é garantido por
// RLS no banco (ver supabase/migrations), não por lógica no front. O front
// confiar em si mesmo pra esconder dado de outra unidade não é segurança.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
