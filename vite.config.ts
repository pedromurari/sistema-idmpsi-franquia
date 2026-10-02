import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Sistema do Franqueador (IDM PSI) — portal financeiro do franqueado + visão
// consolidada do franqueador. Começa com o mesmo baseline de segurança do CRM
// interno (Onze Digital), porque aqui entra dado fiscal/financeiro de terceiros
// (franqueados), não só interno.
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8090,
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
