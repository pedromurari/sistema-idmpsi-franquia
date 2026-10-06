export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      franquia_audit_log: {
        Row: {
          acao: string
          ator: string | null
          created_at: string
          dados_antigos: Json | null
          dados_novos: Json | null
          id: number
          registro_id: string
          tabela: string
        }
        Insert: {
          acao: string
          ator?: string | null
          created_at?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: never
          registro_id: string
          tabela: string
        }
        Update: {
          acao?: string
          ator?: string | null
          created_at?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: never
          registro_id?: string
          tabela?: string
        }
        Relationships: []
      }
      franquia_campanhas: {
        Row: {
          ativo: boolean
          canal_id: string
          created_at: string
          franquia_id: string
          id: string
          nome: string
          oferta: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          canal_id: string
          created_at?: string
          franquia_id: string
          id?: string
          nome: string
          oferta?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          canal_id?: string
          created_at?: string
          franquia_id?: string
          id?: string
          nome?: string
          oferta?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_campanhas_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "franquia_canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquia_campanhas_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_canais: {
        Row: {
          ativo: boolean
          created_at: string
          franquia_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          franquia_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          franquia_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_canais_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_captura_rate_limits: {
        Row: {
          chave: string
          envios: number
          janela_inicio: string
        }
        Insert: {
          chave: string
          envios?: number
          janela_inicio?: string
        }
        Update: {
          chave?: string
          envios?: number
          janela_inicio?: string
        }
        Relationships: []
      }
      franquia_dre_lancamentos: {
        Row: {
          categoria: string
          competencia: string
          created_at: string
          criado_por: string | null
          data_liquidacao: string | null
          descricao: string | null
          franquia_id: string
          id: string
          tipo: string
          turma_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          competencia: string
          created_at?: string
          criado_por?: string | null
          data_liquidacao?: string | null
          descricao?: string | null
          franquia_id: string
          id?: string
          tipo: string
          turma_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          competencia?: string
          created_at?: string
          criado_por?: string | null
          data_liquidacao?: string | null
          descricao?: string | null
          franquia_id?: string
          id?: string
          tipo?: string
          turma_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "dre_turma_mesma_unidade"
            columns: ["franquia_id", "turma_id"]
            isOneToOne: false
            referencedRelation: "franquia_turmas"
            referencedColumns: ["franquia_id", "id"]
          },
          {
            foreignKeyName: "franquia_dre_lancamentos_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_expansao_campanhas: {
        Row: {
          cliques: number
          cpl: number | null
          created_at: string
          ctr: number | null
          data: string
          gasto: number
          id: string
          impressoes: number
          leads_count: number
          updated_at: string
        }
        Insert: {
          cliques?: number
          cpl?: number | null
          created_at?: string
          ctr?: number | null
          data?: string
          gasto?: number
          id?: string
          impressoes?: number
          leads_count?: number
          updated_at?: string
        }
        Update: {
          cliques?: number
          cpl?: number | null
          created_at?: string
          ctr?: number | null
          data?: string
          gasto?: number
          id?: string
          impressoes?: number
          leads_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      franquia_expansao_leads: {
        Row: {
          arquivado_em: string | null
          cidade: string | null
          created_at: string
          criado_por: string | null
          dados_extras: Json
          email: string | null
          estado: string | null
          fase: string
          id: string
          nome: string
          observacoes: string | null
          origem: string
          origem_id: string | null
          responsavel_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          arquivado_em?: string | null
          cidade?: string | null
          created_at?: string
          criado_por?: string | null
          dados_extras?: Json
          email?: string | null
          estado?: string | null
          fase?: string
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string
          origem_id?: string | null
          responsavel_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          arquivado_em?: string | null
          cidade?: string | null
          created_at?: string
          criado_por?: string | null
          dados_extras?: Json
          email?: string | null
          estado?: string | null
          fase?: string
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string
          origem_id?: string | null
          responsavel_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franquia_expansao_leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "franquia_expansao_responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_expansao_responsaveis: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      franquia_lead_atividades: {
        Row: {
          ator: string
          created_at: string
          franquia_id: string
          id: string
          lead_id: string
          nota: string | null
          resultado: string | null
          tipo: string
        }
        Insert: {
          ator?: string
          created_at?: string
          franquia_id: string
          id?: string
          lead_id: string
          nota?: string | null
          resultado?: string | null
          tipo: string
        }
        Update: {
          ator?: string
          created_at?: string
          franquia_id?: string
          id?: string
          lead_id?: string
          nota?: string | null
          resultado?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_lead_atividades_franquia_id_lead_id_fkey"
            columns: ["franquia_id", "lead_id"]
            isOneToOne: false
            referencedRelation: "franquia_leads"
            referencedColumns: ["franquia_id", "id"]
          },
        ]
      }
      franquia_lead_etapas: {
        Row: {
          ator: string | null
          created_at: string
          etapa_anterior: string | null
          etapa_nova: string
          franquia_id: string
          id: number
          lead_id: string
          turma_id: string | null
        }
        Insert: {
          ator?: string | null
          created_at?: string
          etapa_anterior?: string | null
          etapa_nova: string
          franquia_id: string
          id?: never
          lead_id: string
          turma_id?: string | null
        }
        Update: {
          ator?: string | null
          created_at?: string
          etapa_anterior?: string | null
          etapa_nova?: string
          franquia_id?: string
          id?: never
          lead_id?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franquia_lead_etapas_franquia_id_lead_id_fkey"
            columns: ["franquia_id", "lead_id"]
            isOneToOne: false
            referencedRelation: "franquia_leads"
            referencedColumns: ["franquia_id", "id"]
          },
          {
            foreignKeyName: "franquia_lead_etapas_franquia_id_turma_id_fkey"
            columns: ["franquia_id", "turma_id"]
            isOneToOne: false
            referencedRelation: "franquia_turmas"
            referencedColumns: ["franquia_id", "id"]
          },
        ]
      }
      franquia_leads: {
        Row: {
          bolsa_percentual: number
          campanha_id: string | null
          canal_id: string | null
          created_at: string
          criado_por: string
          desconto_percentual: number
          email: string | null
          etapa: string
          franquia_id: string
          id: string
          motivo_perda: string | null
          nome: string
          observacoes: string | null
          origem: string | null
          proxima_acao: string | null
          proxima_acao_em: string | null
          score: number | null
          telefone: string | null
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          bolsa_percentual?: number
          campanha_id?: string | null
          canal_id?: string | null
          created_at?: string
          criado_por?: string
          desconto_percentual?: number
          email?: string | null
          etapa?: string
          franquia_id: string
          id?: string
          motivo_perda?: string | null
          nome: string
          observacoes?: string | null
          origem?: string | null
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          score?: number | null
          telefone?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          bolsa_percentual?: number
          campanha_id?: string | null
          canal_id?: string | null
          created_at?: string
          criado_por?: string
          desconto_percentual?: number
          email?: string | null
          etapa?: string
          franquia_id?: string
          id?: string
          motivo_perda?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string | null
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          score?: number | null
          telefone?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_leads_campanha_mesma_unidade"
            columns: ["franquia_id", "campanha_id"]
            isOneToOne: false
            referencedRelation: "franquia_campanhas"
            referencedColumns: ["franquia_id", "id"]
          },
          {
            foreignKeyName: "franquia_leads_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "franquia_canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquia_leads_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franquia_leads_franquia_id_turma_id_fkey"
            columns: ["franquia_id", "turma_id"]
            isOneToOne: false
            referencedRelation: "franquia_turmas"
            referencedColumns: ["franquia_id", "id"]
          },
        ]
      }
      franquia_metas_turma: {
        Row: {
          competencia: string
          created_at: string
          franquia_id: string
          id: string
          meta_matriculas: number
          turma_id: string
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          franquia_id: string
          id?: string
          meta_matriculas: number
          turma_id: string
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          franquia_id?: string
          id?: string
          meta_matriculas?: number
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_metas_turma_franquia_id_turma_id_fkey"
            columns: ["franquia_id", "turma_id"]
            isOneToOne: false
            referencedRelation: "franquia_turmas"
            referencedColumns: ["franquia_id", "id"]
          },
        ]
      }
      franquia_notas_fiscais: {
        Row: {
          competencia: string
          created_at: string
          data_emissao: string | null
          franquia_id: string
          id: string
          link_pdf: string | null
          numero: string | null
          solicitado_por: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string
          data_emissao?: string | null
          franquia_id: string
          id?: string
          link_pdf?: string | null
          numero?: string | null
          solicitado_por?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          competencia?: string
          created_at?: string
          data_emissao?: string | null
          franquia_id?: string
          id?: string
          link_pdf?: string | null
          numero?: string | null
          solicitado_por?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "franquia_notas_fiscais_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          franquia_id: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          franquia_id?: string | null
          id: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          franquia_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_profiles_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_royalties_regras: {
        Row: {
          base: string
          competencia: string
          created_at: string
          franquia_id: string
          id: string
          percentual: number
          updated_at: string
        }
        Insert: {
          base: string
          competencia: string
          created_at?: string
          franquia_id: string
          id?: string
          percentual: number
          updated_at?: string
        }
        Update: {
          base?: string
          competencia?: string
          created_at?: string
          franquia_id?: string
          id?: string
          percentual?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_royalties_regras_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_social_posts: {
        Row: {
          created_at: string
          criado_por: string
          data_publicacao: string | null
          escopo: string
          franquia_id: string | null
          hora_publicacao: string | null
          id: string
          legenda: string
          media_url: string | null
          observacoes: string
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string
          data_publicacao?: string | null
          escopo: string
          franquia_id?: string | null
          hora_publicacao?: string | null
          id?: string
          legenda?: string
          media_url?: string | null
          observacoes?: string
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          data_publicacao?: string | null
          escopo?: string
          franquia_id?: string | null
          hora_publicacao?: string | null
          id?: string
          legenda?: string
          media_url?: string | null
          observacoes?: string
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_social_posts_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_sugestoes: {
        Row: {
          area: string
          autor_id: string
          autor_nome: string
          created_at: string
          id: string
          resposta: string | null
          rota: string
          status: string
          texto: string
          tipo: string
          updated_at: string
        }
        Insert: {
          area: string
          // O trigger BEFORE INSERT preenche autor e nome; o navegador não tem GRANT nessas colunas.
          autor_id?: string
          autor_nome?: string
          created_at?: string
          id?: string
          resposta?: string | null
          rota: string
          status?: string
          texto: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          area?: string
          autor_id?: string
          autor_nome?: string
          created_at?: string
          id?: string
          resposta?: string | null
          rota?: string
          status?: string
          texto?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      franquia_turmas: {
        Row: {
          ativo: boolean
          capacidade: number | null
          created_at: string
          curso: string
          data_fim: string | null
          data_inicio: string | null
          franquia_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          curso: string
          data_fim?: string | null
          data_inicio?: string | null
          franquia_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number | null
          created_at?: string
          curso?: string
          data_fim?: string | null
          data_inicio?: string | null
          franquia_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_turmas_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      franquias: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string
          data_inauguracao: string | null
          estado: string | null
          id: string
          nome: string
          responsavel_email: string | null
          responsavel_nome: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          data_inauguracao?: string | null
          estado?: string | null
          id?: string
          nome: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          data_inauguracao?: string | null
          estado?: string | null
          id?: string
          nome?: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      franquia_captura_admitir: {
        Args: { p_contato_hash: string; p_ip_hash: string }
        Returns: boolean
      }
      franquia_is_franqueador: { Args: never; Returns: boolean }
      franquia_minha_unidade: { Args: never; Returns: string }
      franquia_usuario_ativo: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
