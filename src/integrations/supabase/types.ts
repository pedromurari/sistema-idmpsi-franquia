// Tipos locais alinhados às migrations 0001–0003; não gerados do banco remoto.
// Depois de aplicar as migrations, substituir pela saída de supabase gen types.
import type { Lancamento, RegraRoyalties, Turma } from "@/lib/financeiro";

type Table<Row, Required extends keyof Row> = {
  Row: { [K in keyof Row]: Row[K] };
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};
type Franquia = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  data_inauguracao: string | null;
  ativo: boolean;
  created_at: string;
};
type Profile = {
  id: string;
  nome: string;
  email: string;
  franquia_id: string | null;
  ativo: boolean;
  created_at: string;
};
type Role = {
  user_id: string;
  role: "franqueador" | "franqueado";
  created_at: string;
};
type Nota = {
  id: string;
  franquia_id: string;
  numero: string | null;
  valor: number;
  status: "pendente" | "emitida" | "cancelada";
  competencia: string;
  data_emissao: string | null;
  link_pdf: string | null;
  solicitado_por: string | null;
  created_at: string;
  updated_at: string;
};
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Audit = {
  id: number;
  tabela: string;
  registro_id: string;
  acao: string;
  ator: string | null;
  dados_antigos: Json;
  dados_novos: Json;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      franquias: Table<Franquia, "nome">;
      franquia_profiles: Table<Profile, "id" | "nome" | "email">;
      franquia_user_roles: Table<Role, "user_id" | "role">;
      franquia_notas_fiscais: Table<
        Nota,
        "franquia_id" | "valor" | "competencia"
      >;
      franquia_dre_lancamentos: Table<
        Lancamento & { criado_por: string | null; created_at: string },
        "franquia_id" | "competencia" | "tipo" | "categoria" | "valor"
      >;
      franquia_turmas: Table<
        Turma & { created_at: string },
        "franquia_id" | "nome" | "curso"
      >;
      franquia_royalties_regras: Table<
        RegraRoyalties & { created_at: string },
        "franquia_id" | "competencia" | "base" | "percentual"
      >;
      franquia_audit_log: Table<Audit, "tabela" | "registro_id" | "acao">;
    };
    Views: { [_ in never]: never };
    Functions: {
      franquia_is_franqueador: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      franquia_minha_unidade: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
