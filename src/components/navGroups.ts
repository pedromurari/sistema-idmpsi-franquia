import { Building2, Calculator, FileText, GraduationCap, LayoutDashboard, Megaphone, MessageSquarePlus, TrendingUp, UsersRound } from "lucide-react";
import type { FranquiaRole } from "@/contexts/AuthContext";

export function navGroups(role: FranquiaRole) {
  const unidade = [
    ...(role === "franqueado" ? [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    { to: "/turmas", label: "Turmas", icon: GraduationCap },
    { to: "/comercial", label: "Comercial", icon: UsersRound },
    { to: "/dre", label: "Financeiro", icon: Calculator },
    { to: "/notas", label: "Notas Fiscais", icon: FileText },
    { to: "/social-unidade", label: "Social mídia · Unidade", icon: Megaphone },
  ];
  if (role === "franqueado") return [{ titulo: "Minha unidade", itens: unidade }];
  return [
    { titulo: "Franqueadora", itens: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/unidades", label: "Unidades", icon: Building2 },
      { to: "/expansao", label: "IDM PSI Franquias", icon: TrendingUp },
      { to: "/social-franqueadora", label: "Social mídia · Franqueadora", icon: Megaphone },
      { to: "/sugestoes", label: "Sugestões da equipe", icon: MessageSquarePlus },
    ] },
    { titulo: "Gestão das unidades", itens: unidade },
  ];
}
