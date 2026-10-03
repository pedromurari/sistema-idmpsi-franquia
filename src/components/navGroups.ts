import { Building2, Calculator, FileText, GraduationCap, LayoutDashboard, Megaphone, MessageSquarePlus, TrendingUp, UsersRound } from "lucide-react";
import type { FranquiaRole } from "@/contexts/AuthContext";

export const rotaFranqueadora = (path: string) => ["/rede", "/unidades", "/expansao", "/social-franqueadora", "/sugestoes"].includes(path);

export function navGroups(role: FranquiaRole, unidadeNome?: string | null) {
  const unidade = [
    { to: "/dashboard", label: "Painel da unidade", icon: LayoutDashboard },
    { to: "/turmas", label: "Turmas", icon: GraduationCap },
    { to: "/comercial", label: "Comercial", icon: UsersRound },
    { to: "/dre", label: "Financeiro", icon: Calculator },
    { to: "/notas", label: "Notas Fiscais", icon: FileText },
    { to: "/social-unidade", label: "Social mídia", icon: Megaphone },
  ];
  if (role === "franqueado") return [{ titulo: "Minha unidade", itens: unidade }];
  return [
    { titulo: "Franqueadora", itens: [
      { to: "/rede", label: "Visão da rede", icon: LayoutDashboard },
      { to: "/unidades", label: "Unidades", icon: Building2 },
      { to: "/expansao", label: "Venda de franquias", icon: TrendingUp },
      { to: "/social-franqueadora", label: "Social mídia central", icon: Megaphone },
      { to: "/sugestoes", label: "Sugestões da equipe", icon: MessageSquarePlus },
    ] },
    ...(unidadeNome ? [{ titulo: `Unidade: ${unidadeNome}`, itens: unidade }] : []),
  ];
}
