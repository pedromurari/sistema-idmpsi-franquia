// Servidor exclusivo dos testes: nunca usa o Supabase real nem muda o .env.
import { createServer } from 'vite';
process.env.VITE_SUPABASE_URL = 'https://portal-test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'chave-publica-ficticia-apenas-testes';
const server = await createServer({ server: { host: '127.0.0.1', port: 8091, strictPort: true } });
await server.listen();
server.printUrls();
