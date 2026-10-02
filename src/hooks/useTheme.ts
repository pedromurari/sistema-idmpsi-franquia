import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'franqueadora-theme';

function lerPreferenciaInicial(): Theme {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === 'light' || salvo === 'dark') return salvo;
  } catch { /* localStorage indisponível (ex: aba anônima) -- cai no padrão abaixo */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Tema claro/escuro -- mesma convenção do CRM interno (classe `.dark` na raiz). */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(lerPreferenciaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignora quota/privado */ }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
