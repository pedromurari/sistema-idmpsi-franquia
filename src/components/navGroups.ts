import { Building2, Calculator, CheckSquare, FileText, GraduationCap, LayoutDashboard, Megaphone, MessageCircle, MessageSquarePlus, TrendingUp, UserRound, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FranquiaRole } from "@/contexts/AuthContext";

export type NavItem = { to: string; label: string; icon: LucideIcon };
// Seção = divisória por departamento dentro de um grupo (mesmo padrão do CRM
// interno: uma lista só, com rótulo de departamento no meio, em vez de menus
// separados por papel).
export type NavSecao = { titulo: string; itens: NavItem[] };
export type NavGrupo = { titulo: string; secoes: NavSecao[] };

export const rotaFranqueadora = (path: string) => ["/rede", "/unidades", "/expansao", "/social-franqueadora", "/sugestoes", "/whatsapp"].includes(path);

export const itensDoGrupo = (grupo: NavGrupo): NavItem[] => grupo.secoes.flatMap((secao) => secao.itens);

export function navGroups(role: FranquiaRole, unidadeNome?: string | null): NavGrupo[] {
  const unidade: NavSecao[] = [
    { titulo: "Visão geral", itens: [{ to: "/dashboard", label: "Painel da unidade", icon: LayoutDashboard }] },
    { titulo: "Comercial", itens: [{ to: "/comercial", label: "Comercial", icon: UsersRound }] },
    { titulo: "Acadêmico", itens: [
      { to: "/turmas", label: "Turmas", icon: GraduationCap },
      { to: "/alunos", label: "Alunos", icon: UserRound },
    ] },
    { titulo: "Financeiro", itens: [
      { to: "/dre", label: "Financeiro", icon: Calculator },
      { to: "/notas", label: "Notas Fiscais", icon: FileText },
    ] },
    { titulo: "Operação", itens: [
      { to: "/tarefas", label: "Operacional", icon: CheckSquare },
      { to: "/social-unidade", label: "Social mídia", icon: Megaphone },
    ] },
  ];
  // vendedor cai no mesmo menu de unidade que franqueado -- só franqueador
  // enxerga a área central da rede. Checagem explícita (não "else"), pra um
  // terceiro papel futuro não herdar o menu da franqueadora por acidente.
  if (role !== "franqueador") return [{ titulo: "Minha unidade", secoes: unidade }];
  return [
    { titulo: "Franqueadora", secoes: [
      { titulo: "Rede", itens: [
        { to: "/rede", label: "Visão da rede", icon: LayoutDashboard },
        { to: "/unidades", label: "Unidades", icon: Building2 },
      ] },
      // O WhatsApp conectado é o número da franqueadora falando com quem quer
      // comprar franquia -- por isso mora junto da venda de franquias, não no
      // funil de aluno da unidade.
      { titulo: "Expansão", itens: [
        { to: "/expansao", label: "Venda de franquias", icon: TrendingUp },
        { to: "/whatsapp", label: "WhatsApp da rede", icon: MessageCircle },
      ] },
      { titulo: "Marketing", itens: [{ to: "/social-franqueadora", label: "Social mídia central", icon: Megaphone }] },
      { titulo: "Equipe", itens: [{ to: "/sugestoes", label: "Sugestões da equipe", icon: MessageSquarePlus }] },
    ] },
    ...(unidadeNome ? [{ titulo: `Unidade: ${unidadeNome}`, secoes: unidade }] : []),
  ];
}
