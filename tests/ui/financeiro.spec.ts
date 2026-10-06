import { test, expect, type Page } from "@playwright/test";

// Contrato HTTP simulado para testar UI. RLS e SQL reais são testados separadamente no PGlite.
async function preparar(
  page: Page,
  role: "franqueador" | "franqueado" = "franqueador",
) {
  const userId = role === "franqueador" ? "admin" : "franqueado-a";
  const timestamp = "2026-01-01T12:00:00.000Z";
  const dados: Record<string, Record<string, unknown>[]> = {
    franquias: [
      { id: "unidade-a", nome: "Unidade Alfa", ativo: true },
      { id: "unidade-b", nome: "Unidade Beta", ativo: true },
    ],
    franquia_profiles: [
      {
        id: userId,
        nome: "Usuário teste",
        email: "teste@example.test",
        ativo: true,
        franquia_id: role === "franqueado" ? "unidade-a" : null,
      },
    ],
    franquia_user_roles: [{ user_id: userId, role }],
    franquia_turmas: [
      {
        id: "turma-a",
        franquia_id: "unidade-a",
        nome: "Turma Alfa",
        curso: "Psicanálise",
        ativo: true,
        capacidade: 30,
        data_inicio: null,
        data_fim: null,
        updated_at: timestamp,
      },
      {
        id: "turma-b",
        franquia_id: "unidade-b",
        nome: "Turma Beta",
        curso: "Psicanálise",
        ativo: true,
        capacidade: 20,
        data_inicio: null,
        data_fim: null,
        updated_at: timestamp,
      },
    ],
    franquia_dre_lancamentos: [
      {
        id: "receita",
        franquia_id: "unidade-a",
        turma_id: "turma-a",
        competencia: "2026-09-01",
        data_liquidacao: "2026-10-01",
        tipo: "receita",
        categoria: "Mensalidade",
        descricao: "Receita de setembro recebida em outubro",
        valor: 1000,
        updated_at: timestamp,
      },
      {
        id: "despesa",
        franquia_id: "unidade-a",
        turma_id: null,
        competencia: "2026-10-01",
        data_liquidacao: null,
        tipo: "despesa",
        categoria: "Aluguel",
        descricao: null,
        valor: 200,
        updated_at: timestamp,
      },
    ],
    franquia_royalties_regras: [],
    franquia_notas_fiscais: [],
    franquia_leads: [
      { id: "lead-b", franquia_id: "unidade-b", nome: "Lead de outra unidade", email: "outra@example.test", telefone: null, etapa: "lead", turma_id: "turma-b", score: null, proxima_acao_em: null, proxima_acao: null, bolsa_percentual: 0, desconto_percentual: 0, motivo_perda: null, observacoes: null, origem: null, updated_at: timestamp },
    ],
    franquia_lead_etapas: [],
    franquia_lead_atividades: [],
    franquia_metas_turma: [],
    franquia_canais: [
      { id: "canal-direto", franquia_id: null, nome: "Direto", ativo: true },
      { id: "canal-b", franquia_id: "unidade-b", nome: "Parceiro Beta", ativo: true },
    ],
    franquia_campanhas: [],
    franquia_expansao_leads: [],
    franquia_expansao_campanhas: [],
    franquia_expansao_responsaveis: [
      { id: "rodrygo", nome: "Rodrygo", ativo: true },
      { id: "marcos", nome: "Marcos", ativo: true },
    ],
    franquia_social_posts: [],
    franquia_social_copies: [],
  };
  await page.route("https://portal-test.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith("/auth/"))
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    const tabela = url.pathname.split("/").pop()!;
    const filtros = [...url.searchParams.entries()].filter(([, value]) =>
      /^(eq|gte|lt)\./.test(value),
    );
    const filtrar = (item: Record<string, unknown>) =>
      filtros.every(([key, value]) => {
        const [op, ...resto] = value.split(".");
        const alvo = resto.join(".");
        const atual = item[key];
        if (atual === null || atual === undefined) return false;
        return op === "eq"
          ? String(atual) === alvo
          : op === "gte"
            ? String(atual) >= alvo
            : String(atual) < alvo;
      });
    let resultado = (dados[tabela] ?? []).filter(filtrar);
    if (request.method() === "POST") {
      const payload = request.postDataJSON();
      const item = {
        id: `novo-${Date.now()}`,
        updated_at: new Date().toISOString(),
        ...(["franquia_canais", "franquia_campanhas"].includes(tabela) ? { ativo: true } : {}),
        ...payload,
      };
      dados[tabela].push(item);
      resultado = [item];
    } else if (request.method() === "PATCH") {
      for (const item of resultado)
        Object.assign(item, request.postDataJSON(), {
          updated_at: new Date().toISOString(),
        });
    } else {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 1000);
      resultado = resultado.slice(offset, offset + limit);
    }
    const unico = request
      .headers()
      .accept?.includes("application/vnd.pgrst.object+json");
    if (unico && resultado.length !== 1)
      return route.fulfill({
        status: 406,
        contentType: "application/json",
        body: JSON.stringify({ code: "PGRST116", message: "Expected one row" }),
      });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(unico ? (resultado[0] ?? null) : resultado),
    });
  });
  await page.addInitScript(
    ({ userId }) => {
      localStorage.setItem(
        "sb-portal-test-auth-token",
        JSON.stringify({
          access_token: "token-ficticio-de-teste",
          refresh_token: "refresh-ficticio",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: userId,
            email: "teste@example.test",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-01-01T00:00:00Z",
          },
        }),
      );
    },
    { userId },
  );
  return dados;
}

async function selecionarUnidade(page: Page, nome = "Unidade Alfa") {
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: nome, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Dashboard — ${nome}` }),
  ).toBeVisible();
}

test("ADM alterna claramente entre rede e operação de uma unidade", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/rede$/);
  await expect(page.getByRole("heading", { name: "Dashboard — Rede IDM PSI" })).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Financeiro" })).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir unidade" }).first().click();
  await expect(page.getByRole("heading", { name: "Dashboard — Unidade Alfa" })).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Financeiro" })).toBeVisible();
  await page.getByRole("combobox", { name: "Área de trabalho" }).click();
  await page.getByRole("option", { name: "Franqueadora · rede" }).click();
  await expect(page).toHaveURL(/\/rede$/);
  await expect(page.locator("aside").getByRole("link", { name: "Financeiro" })).toHaveCount(0);
});

test("franqueado cadastra lead da própria unidade, avança etapa e exige motivo da perda", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (error) => erros.push(error.message));
  const dados = await preparar(page, "franqueado");
  await page.goto("/comercial");
  await expect(page.getByRole("heading", { name: "Comercial e captação" })).toBeVisible();
  await expect(page.getByText("Lead de outra unidade")).toHaveCount(0);
  await page.getByRole("button", { name: "Novo lead" }).click();
  await page.getByLabel("Nome *").fill("Maria Silva");
  await page.getByLabel("E-mail").fill("maria@example.test");
  await page.getByLabel("Turma de interesse").selectOption("turma-a");
  await page.getByRole("button", { name: "Salvar lead" }).click();
  await expect(page.getByText("Maria Silva")).toBeVisible();
  expect(dados.franquia_leads.some((lead) => lead.nome === "Maria Silva" && lead.franquia_id === "unidade-a")).toBe(true);
  await page.getByRole("button", { name: "Editar Maria Silva" }).click();
  await page.getByLabel("Etapa").selectOption("perdido");
  await page.getByRole("button", { name: "Salvar lead" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "motivo da perda" })).toBeVisible();
  await page.getByLabel("Motivo da perda *").fill("Sem interesse");
  await page.getByRole("button", { name: "Salvar lead" }).click();
  await expect(page.getByRole("region", { name: "Perdido" }).getByText("Maria Silva")).toBeVisible();
  expect(erros).toEqual([]);
});

test("comercial cria canal e campanha da unidade e filtra leads sem misturar a outra unidade", async ({ page }) => {
  const dados = await preparar(page, "franqueado");
  await page.goto("/comercial");
  await expect(page.getByRole("button", { name: /Parceiro Beta/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Novo canal" }).click();
  await page.getByLabel("Nome do canal").fill("Indicação local");
  await page.getByRole("button", { name: "Criar canal" }).click();
  await expect.poll(() => dados.franquia_canais.length).toBe(3);
  await expect(page.getByRole("button", { name: /Indicação local/ })).toBeVisible();
  const canal = dados.franquia_canais.find((item) => item.nome === "Indicação local");
  expect(canal?.franquia_id).toBe("unidade-a");
  await page.getByRole("button", { name: "Nova campanha" }).click();
  await page.getByLabel("Nome da campanha").fill("Aulão de outubro");
  await page.getByLabel("Canal", { exact: true }).selectOption(String(canal?.id));
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await page.getByRole("button", { name: "Novo lead" }).click();
  await page.getByLabel("Nome *").fill("Ana da campanha");
  await page.getByLabel("E-mail").fill("ana@example.test");
  await page.getByLabel("Canal de aquisição").selectOption(String(canal?.id));
  await page.getByRole("dialog", { name: "Novo lead" }).getByLabel("Campanha", { exact: true }).selectOption(String(dados.franquia_campanhas[0].id));
  await page.getByRole("button", { name: "Salvar lead" }).click();
  await expect(page.getByText("Ana da campanha")).toBeVisible();
  expect(dados.franquia_leads.find((item) => item.nome === "Ana da campanha")?.campanha_id).toBe(dados.franquia_campanhas[0].id);
  await page.getByRole("button", { name: /Direto · 0/ }).click();
  await expect(page.getByText("Ana da campanha")).toHaveCount(0);
  await page.getByRole("button", { name: /Indicação local · 1/ }).click();
  await expect(page.getByText("Ana da campanha")).toBeVisible();
});

test("comercial destaca retorno vencido e registra contato no histórico do lead", async ({ page }) => {
  const dados = await preparar(page, "franqueado");
  await page.goto("/comercial");
  await page.getByRole("button", { name: "Novo lead" }).click();
  await page.getByLabel("Nome *").fill("Contato pendente");
  await page.getByLabel("Telefone").fill("11999998888");
  await page.getByLabel("Próxima ação: data").fill("2026-01-01");
  await page.getByLabel("Próxima ação", { exact: true }).fill("Retornar ligação");
  await page.getByRole("button", { name: "Salvar lead" }).click();
  await page.getByRole("button", { name: /Retornos atrasados · 1/ }).click();
  await expect(page.getByText("Contato pendente")).toBeVisible();
  await page.getByRole("button", { name: "Histórico e contato" }).click();
  await expect(page.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute("href", "https://wa.me/5511999998888");
  await page.getByLabel("Resultado da ligação").selectOption("nao_atendeu");
  await page.getByLabel("Detalhes do contato").fill("Tentar amanhã");
  await page.getByRole("button", { name: "Registrar atividade" }).click();
  await expect(page.getByText("Ligação: nao atendeu")).toBeVisible();
  expect(dados.franquia_lead_atividades[0].franquia_id).toBe("unidade-a");
});

test("admin define meta mensal por turma sem criar dados na outra unidade", async ({ page }) => {
  const dados = await preparar(page);
  await page.goto("/");
  await selecionarUnidade(page);
  await page.getByRole("link", { name: "Comercial" }).first().click();
  await page.getByRole("button", { name: "Definir meta" }).first().click();
  await page.getByLabel("Matrículas previstas").fill("12");
  await page.getByRole("button", { name: "Salvar meta" }).click();
  await expect(page.getByText("0 / 12")).toBeVisible();
  expect(dados.franquia_metas_turma).toHaveLength(1);
  expect(dados.franquia_metas_turma[0].franquia_id).toBe("unidade-a");
  expect(dados.franquia_metas_turma[0].turma_id).toBe("turma-a");
});

test("venda de franquias aparece só ao ADM e mantém Kanban e campanha separados do funil de alunos", async ({ page }) => {
  const dados = await preparar(page);
  await page.goto("/expansao");
  await expect(page.getByRole("heading", { name: "IDM PSI Franquias" })).toBeVisible();
  await page.getByRole("button", { name: "Novo lead" }).click();
  await page.getByLabel("Nome *").fill("Interessado Franquia");
  await page.getByLabel("WhatsApp").fill("11999999999");
  await page.getByLabel("Responsável").selectOption("rodrygo");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Novo" }).getByText("Interessado Franquia")).toBeVisible();
  expect(dados.franquia_expansao_leads).toHaveLength(1);
  expect(dados.franquia_leads).toHaveLength(1);
  await page.getByRole("button", { name: "Campanha", exact: true }).click();
  await page.getByRole("button", { name: "Registrar métricas" }).click();
  await page.getByLabel("Gasto (R$)").fill("150");
  await page.getByLabel("Leads", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("R$ 50,00").first()).toBeVisible();
  expect(dados.franquia_expansao_campanhas).toHaveLength(1);
});

test("franqueado não vê nem abre a área de venda de franquias", async ({ page }) => {
  await preparar(page, "franqueado");
  await page.goto("/expansao");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Venda de franquias" })).toHaveCount(0);
});

test("página pública de interesse habilita envio após contato e consentimento", async ({ page }) => {
  await page.goto("/quero-ser-franqueado");
  await expect(page.getByRole("heading", { name: /Quer conhecer a oportunidade/ })).toBeVisible();
  const botao = page.getByRole("button", { name: "Quero saber mais" });
  await expect(botao).toBeDisabled();
  await page.getByLabel("Nome *").fill("Maria Silva");
  await page.getByLabel("E-mail").fill("maria@example.test");
  await page.getByRole("checkbox").check();
  await expect(botao).toBeEnabled();
});

test("social mídia separa menus e conteúdos da franqueadora e das unidades", async ({ page }) => {
  const dados = await preparar(page);
  await page.goto("/social-franqueadora");
  await expect(page.getByRole("heading", { name: "Social mídia · Franqueadora" })).toBeVisible();
  await expect(page.locator("aside").getByText("Franqueadora", { exact: true })).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Turmas" })).toHaveCount(0);
  await page.getByRole("button", { name: "Novo conteúdo" }).click();
  await page.getByLabel("Título *").fill("Corte da marca");
  await page.getByLabel("Data planejada").fill("2026-10-07");
  await page.getByLabel("Hora (Brasília)").fill("08:00");
  await page.getByLabel("Link do vídeo ou arte").fill("https://drive.google.com/file/d/exemplo/view");
  await page.getByLabel("Legenda").fill("Legenda revisada do conteúdo.");
  await page.getByLabel("Status", { exact: true }).selectOption("agendado");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Corte da marca")).toBeVisible();
  await expect(page.getByText("Publicação manual no horário planejado")).toBeVisible();
  expect(dados.franquia_social_posts[0].escopo).toBe("franqueadora");
  expect(dados.franquia_social_posts[0].hora_publicacao).toBe("08:00");
  await page.getByRole("combobox", { name: "Área de trabalho" }).click();
  await page.getByRole("option", { name: "Unidade Alfa" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator("aside").getByText("Unidade: Unidade Alfa", { exact: true })).toBeVisible();
  await page.locator("aside").getByRole("link", { name: "Social mídia", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Social mídia · Unidade" })).toBeVisible();
  await expect(page.getByText("Corte da marca")).toHaveCount(0);
  await page.getByRole("button", { name: "Novo conteúdo" }).click();
  await page.getByLabel("Título *").fill("Corte da unidade");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Corte da unidade")).toBeVisible();
  expect(dados.franquia_social_posts[1].escopo).toBe("unidade");
  expect(dados.franquia_social_posts[1].franquia_id).toBe("unidade-a");
});

test("franqueado acessa apenas social mídia da própria unidade", async ({ page }) => {
  const dados = await preparar(page, "franqueado");
  await page.goto("/rede");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/social-franqueadora");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Social mídia central" })).toHaveCount(0);
  await page.goto("/social-unidade");
  await expect(page.getByRole("heading", { name: "Social mídia · Unidade" })).toBeVisible();
  await page.getByRole("button", { name: "Novo conteúdo" }).click();
  await page.getByLabel("Título *").fill("Conteúdo local");
  await page.getByRole("button", { name: "Salvar" }).click();
  expect(dados.franquia_social_posts[0].franquia_id).toBe("unidade-a");
});

test("social central alterna entre cortes e copies com pendências independentes", async ({ page }) => {
  const dados = await preparar(page);
  await page.goto("/social-franqueadora");
  await expect(page.getByRole("tab", { name: "Cortes" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Copies para anúncios" }).click();
  await expect(page.getByRole("heading", { name: "Copies para anúncios" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo conteúdo" })).toHaveCount(0);
  await page.getByRole("button", { name: "Nova pendência" }).click();
  await page.getByLabel("Título *").fill("Anúncio da nova turma");
  await page.getByLabel("Briefing / objetivo").fill("Captar interessados na turma de outubro");
  await page.getByLabel("Prazo").fill("2026-10-10");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("button", { name: /Anúncio da nova turma/ })).toBeVisible();
  expect(dados.franquia_social_copies).toHaveLength(1);
  expect(dados.franquia_social_posts).toHaveLength(0);
  await page.getByLabel("Status de Anúncio da nova turma").selectOption("criacao");
  await expect(page.getByRole("region", { name: "Em criação" }).getByText("Anúncio da nova turma")).toBeVisible();
  await page.getByRole("tab", { name: "Cortes" }).click();
  await expect(page.getByRole("button", { name: "Novo conteúdo" })).toBeVisible();
  await expect(page.getByText("Anúncio da nova turma")).toHaveCount(0);
});

test("admin cria turma, lança receita, baixa no caixa e configura royalties sem afetar competência anterior", async ({
  page,
}) => {
  const erros: string[] = [];
  page.on("pageerror", (error) => erros.push(error.message));
  const dados = await preparar(page);
  await page.goto("/");
  await selecionarUnidade(page);
  await page.getByRole("link", { name: "Turmas", exact: true }).click();
  await page.getByRole("button", { name: "Nova turma" }).click();
  await page.getByLabel("Nome da turma").fill("Turma Nova");
  await page
    .getByLabel("Curso", { exact: true })
    .fill("Formação em Psicanálise");
  await page.getByLabel("Capacidade (opcional)").fill("25");
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText("Turma Nova", { exact: true })).toBeVisible();
  expect(dados.franquia_turmas.at(-1)?.franquia_id).toBe("unidade-a");
  await page.getByRole("link", { name: "Financeiro", exact: true }).click();
  await page.getByLabel("Mês de referência").fill("2026-10");
  await expect(page.getByText("Aluguel", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Mensalidade/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByLabel("Categoria", { exact: true }).fill("Matrícula");
  await page
    .getByLabel("Turma", { exact: true })
    .last()
    .selectOption("turma-a");
  await page.getByLabel("Valor (R$)").fill("500,00");
  await page
    .getByLabel("Recebido integralmente em (opcional)")
    .fill("2026-10-01");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Caixa realizado" }).click();
  await expect(
    page.getByRole("cell", { name: /Receita de setembro/ }),
  ).toBeVisible();
  await expect(page.getByText("Matrícula", { exact: true })).toBeVisible();
  await expect(page.getByText("Aluguel", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Configurar mês" }).click();
  await page.getByLabel("Base de cálculo").selectOption("caixa");
  await page.getByLabel("Percentual (%)").fill("5");
  await page.getByRole("button", { name: "Salvar regra" }).click();
  await expect(page.getByText("R$ 75,00", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".verification/financeiro-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Turma", { exact: true }).selectOption("sem-turma");
  await expect(page.getByText("R$ 75,00", { exact: true })).toBeVisible();
  await page.getByLabel("Mês de referência").fill("2026-09");
  await expect(page.getByText(/Sem regra para este mês/)).toBeVisible();
  expect(dados.franquia_royalties_regras).toHaveLength(1);
  expect(erros).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("franqueado consulta pelo celular sem ações administrativas e sem sair da própria unidade", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page, "franqueado");
  await page.goto("/turmas");
  await expect(page.getByText("Turma Alfa", { exact: true })).toBeVisible();
  await expect(page.getByText("Turma Beta", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nova turma" })).toHaveCount(0);
  await page.getByRole("link", { name: "Financeiro", exact: true }).click();
  await page.getByLabel("Mês de referência").fill("2026-10");
  await expect(page.getByText("Aluguel", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Novo lançamento|Configurar mês|Editar/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: ".verification/financeiro-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("troca de unidade não mantém turmas nem lançamentos da unidade anterior", async ({
  page,
}) => {
  await preparar(page);
  await page.goto("/");
  await selecionarUnidade(page);
  await page.getByRole("link", { name: "Turmas", exact: true }).click();
  await expect(page.getByText("Turma Alfa", { exact: true })).toBeVisible();
  await selecionarUnidade(page, "Unidade Beta");
  await page.getByRole("link", { name: "Turmas", exact: true }).click();
  await expect(page.getByText("Turma Beta", { exact: true })).toBeVisible();
  await expect(page.getByText("Turma Alfa", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Financeiro", exact: true }).click();
  await expect(
    page.getByText("Nenhum lançamento nesta competência e filtro."),
  ).toBeVisible();
});

test("erro de leitura não é apresentado como financeiro zerado", async ({
  page,
}) => {
  await preparar(page, "franqueado");
  await page.route("**/rest/v1/franquia_dre_lancamentos?**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ message: "permission denied", code: "42501" }),
    }),
  );
  await page.goto("/dre");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar",
    { timeout: 15000 },
  );
  await expect(page.getByText("Resultado", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tentar novamente" }),
  ).toBeVisible();
});

test("editar baixa e vínculo preserva competência; concorrência não sobrescreve dados", async ({
  page,
}) => {
  const dados = await preparar(page);
  await page.goto("/");
  await selecionarUnidade(page);
  await page.getByRole("link", { name: "Financeiro", exact: true }).click();
  await page.getByLabel("Mês de referência").fill("2026-10");
  await page.getByRole("button", { name: /Editar Aluguel/ }).click();
  await page
    .getByLabel("Turma", { exact: true })
    .last()
    .selectOption("turma-a");
  await page.getByLabel("Pago integralmente em (opcional)").fill("2026-10-01");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Caixa realizado" }).click();
  await expect(page.getByText("Aluguel", { exact: true })).toBeVisible();
  expect(
    dados.franquia_dre_lancamentos.find((item) => item.id === "despesa")
      ?.competencia,
  ).toBe("2026-10-01");
  await page.getByRole("button", { name: /Editar Aluguel/ }).click();
  dados.franquia_dre_lancamentos.find(
    (item) => item.id === "despesa",
  )!.updated_at = "2026-12-01T12:00:00.000Z";
  await page.getByLabel("Valor (R$)").fill("300");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByRole("alert")).toContainText("O lançamento mudou");
  expect(
    dados.franquia_dre_lancamentos.find((item) => item.id === "despesa")?.valor,
  ).toBe(200);
});
