export const SOCIAL_STATUS = [
  { id: "planejado", label: "Planejado", cor: "bg-slate-500" },
  { id: "criacao", label: "Em criação", cor: "bg-blue-600" },
  { id: "revisao", label: "Em revisão", cor: "bg-amber-600" },
  { id: "aprovado", label: "Aprovado", cor: "bg-emerald-600" },
  { id: "agendado", label: "Programado", cor: "bg-violet-600" },
  { id: "publicado", label: "Publicado", cor: "bg-green-700" },
] as const;

export const SOCIAL_TIPOS = [
  { id: "reel", label: "Reel / corte" },
  { id: "carrossel", label: "Carrossel" },
  { id: "story", label: "Story" },
  { id: "post", label: "Post simples" },
] as const;

export function proximosCortes(inicio: Date, quantidade = 10): string[] {
  const primeiro = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const diasAteSegunda = (8 - primeiro.getDay()) % 7 || 7;
  primeiro.setDate(primeiro.getDate() + diasAteSegunda);
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(primeiro);
    data.setDate(data.getDate() + Math.floor(indice / 3) * 7 + [0, 2, 4][indice % 3]);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  });
}
