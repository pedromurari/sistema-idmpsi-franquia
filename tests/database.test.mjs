import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const admin = "00000000-0000-0000-0000-000000000001";
const alunoA = "00000000-0000-0000-0000-000000000002";
const alunoB = "00000000-0000-0000-0000-000000000003";
const inativo = "00000000-0000-0000-0000-000000000004";
const unidadeA = "10000000-0000-0000-0000-000000000001";
const unidadeB = "10000000-0000-0000-0000-000000000002";
const turmaA = "20000000-0000-0000-0000-000000000001";
const turmaB = "20000000-0000-0000-0000-000000000002";
const legado = "30000000-0000-0000-0000-000000000001";
async function como(id, query, params = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${id}';`);
  try {
    return await db.query(query, params);
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub;");
  }
}
before(async () => {
  await db.exec(`create role authenticated nologin; create role anon nologin;
    create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  await db.exec(`alter default privileges for role postgres in schema public
    grant truncate, references, trigger on tables to authenticated, anon;`);
  for (const file of ["0001_init_franquias.sql", "0002_grants.sql"])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(`insert into auth.users values ('${admin}'),('${alunoA}'),('${alunoB}'),('${inativo}');
    insert into franquias(id,nome) values ('${unidadeA}','Unidade A'),('${unidadeB}','Unidade B');
    insert into franquia_profiles(id,nome,email,franquia_id,ativo) values
      ('${admin}','Admin','admin@example.test',null,true),('${alunoA}','A','a@example.test','${unidadeA}',true),
      ('${alunoB}','B','b@example.test','${unidadeB}',true),('${inativo}','Inativo','inativo@example.test','${unidadeA}',false);
    insert into franquia_user_roles(user_id,role) values ('${admin}','franqueador'),('${alunoA}','franqueado'),('${alunoB}','franqueado'),('${inativo}','franqueado');
    insert into franquia_dre_lancamentos(id,franquia_id,competencia,tipo,categoria,valor) values ('${legado}','${unidadeA}','2026-09-01','receita','Mensalidade antiga',1000);`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/0003_turmas_financeiro.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/0004_restringir_grants.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/0005_funil_comercial.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/0006_proteger_solicitacao_nf.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/0007_expansao_franquias.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/0008_captura_rate_limit.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/0009_social_midia.sql", import.meta.url),
      "utf8",
    ),
  );
});
after(async () => {
  await db.close();
});

test("papéis da API não podem truncar nem administrar tabelas; novas tabelas exigem grant explícito", async () => {
  const { rows } = await db.query(`select c.relname from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
    and (has_table_privilege('authenticated',c.oid,'TRUNCATE')
      or has_table_privilege('authenticated',c.oid,'TRIGGER')
      or has_table_privilege('authenticated',c.oid,'REFERENCES')
      or has_table_privilege('anon',c.oid,'SELECT'))`);
  assert.deepEqual(rows, []);
  await assert.rejects(
    como(admin, "truncate franquia_audit_log"),
    /permission denied/,
  );
  await db.exec("create table public.teste_grants_futuros(id integer)");
  const futuro = await db.query(
    "select has_table_privilege('authenticated','public.teste_grants_futuros','TRUNCATE') as truncar",
  );
  assert.equal(futuro.rows[0].truncar, false);
  await db.exec("drop table public.teste_grants_futuros");
});

test("migration preserva registros antigos sem inventar turma, caixa ou royalties", async () => {
  const { rows } = await db.query(
    "select valor, turma_id, data_liquidacao from franquia_dre_lancamentos where id=$1",
    [legado],
  );
  assert.equal(Number(rows[0].valor), 1000);
  assert.equal(rows[0].turma_id, null);
  assert.equal(rows[0].data_liquidacao, null);
  assert.equal(
    (await db.query("select * from franquia_royalties_regras")).rows.length,
    0,
  );
});
test("admin cadastra turmas com GRANT e auditoria; franqueados só leem a própria", async () => {
  await como(
    admin,
    "insert into franquia_turmas(id,franquia_id,nome,curso) values ($1,$2,$3,$4),($5,$6,$7,$4)",
    [turmaA, unidadeA, "Turma A", "Psicanálise", turmaB, unidadeB, "Turma B"],
  );
  assert.equal(
    (await como(admin, "select * from franquia_turmas")).rows.length,
    2,
  );
  assert.deepEqual(
    (await como(alunoA, "select id from franquia_turmas")).rows,
    [{ id: turmaA }],
  );
  assert.deepEqual(
    (await como(alunoB, "select id from franquia_turmas")).rows,
    [{ id: turmaB }],
  );
  await assert.rejects(
    como(
      alunoA,
      "insert into franquia_turmas(franquia_id,nome,curso) values ($1,$2,$3)",
      [unidadeA, "Proibida", "Curso"],
    ),
    /row-level security/,
  );
  assert.equal(
    (
      await como(
        alunoA,
        "update franquia_turmas set nome=$1 where id=$2 returning id",
        ["Alterada", turmaA],
      )
    ).rows.length,
    0,
  );
  const log = (
    await como(
      admin,
      "select ator from franquia_audit_log where tabela='franquia_turmas'",
    )
  ).rows;
  assert.equal(log.length, 2);
  assert.ok(log.every((row) => row.ator === admin));
  assert.equal(
    (await como(alunoA, "select * from franquia_audit_log")).rows.length,
    0,
  );
});
test("FK composta rejeita turma de outra unidade mesmo para o administrador", async () => {
  await assert.rejects(
    como(admin, "update franquia_dre_lancamentos set turma_id=$1 where id=$2", [
      turmaB,
      legado,
    ]),
    /dre_turma_mesma_unidade/,
  );
  await como(
    admin,
    "update franquia_dre_lancamentos set turma_id=$1, data_liquidacao=$2 where id=$3",
    [turmaA, "2026-10-01", legado],
  );
  const { rows } = await como(
    admin,
    "select competencia::text,data_liquidacao::text from franquia_dre_lancamentos where id=$1",
    [legado],
  );
  assert.deepEqual(rows[0], {
    competencia: "2026-09-01",
    data_liquidacao: "2026-10-01",
  });
  assert.equal(
    (await como(alunoB, "select * from franquia_dre_lancamentos")).rows.length,
    0,
  );
  assert.equal(
    (
      await como(
        alunoA,
        "update franquia_dre_lancamentos set valor=1 where id=$1 returning id",
        [legado],
      )
    ).rows.length,
    0,
  );
  const { rows: audit } = await como(
    admin,
    "select dados_antigos, dados_novos, ator from franquia_audit_log where registro_id=$1 and acao='update'",
    [legado],
  );
  assert.equal(audit[0].dados_antigos.turma_id, null);
  assert.equal(audit[0].dados_novos.turma_id, turmaA);
  assert.equal(audit[0].ator, admin);
});
test("royalties isolados por unidade e mês, percentual limitado e franqueado sem escrita", async () => {
  await como(
    admin,
    "insert into franquia_royalties_regras(franquia_id,competencia,base,percentual) values ($1,$2,$3,$4),($1,$5,$3,0)",
    [unidadeA, "2026-10-01", "caixa", 5, "2026-11-01"],
  );
  assert.equal(
    (await como(alunoA, "select * from franquia_royalties_regras")).rows.length,
    2,
  );
  assert.equal(
    (await como(alunoB, "select * from franquia_royalties_regras")).rows.length,
    0,
  );
  await assert.rejects(
    como(
      alunoA,
      "insert into franquia_royalties_regras(franquia_id,competencia,base,percentual) values ($1,$2,$3,$4)",
      [unidadeA, "2026-12-01", "caixa", 0],
    ),
    /row-level security/,
  );
  await assert.rejects(
    como(admin, "update franquia_royalties_regras set percentual=101"),
    /check constraint/,
  );
  await assert.rejects(
    como(admin, "update franquia_royalties_regras set base='lucro'"),
    /check constraint/,
  );
  await como(
    admin,
    "update franquia_royalties_regras set percentual=7 where competencia=$1",
    ["2026-10-01"],
  );
  const { rows } = await como(
    admin,
    "select percentual from franquia_royalties_regras where competencia=$1",
    ["2026-11-01"],
  );
  assert.equal(Number(rows[0].percentual), 0);
  assert.equal(
    (
      await como(
        alunoA,
        "update franquia_royalties_regras set percentual=0 returning id",
      )
    ).rows.length,
    0,
  );
  assert.ok(
    (
      await como(
        admin,
        "select * from franquia_audit_log where tabela='franquia_royalties_regras' and acao='update'",
      )
    ).rows.length > 0,
  );
});
test("usuários inativos e anônimos não acessam dados financeiros", async () => {
  for (const table of [
    "franquia_turmas",
    "franquia_dre_lancamentos",
    "franquia_royalties_regras",
  ]) {
    assert.equal(
      (await como(inativo, `select * from ${table}`)).rows.length,
      0,
    );
  }
  await db.exec(`update franquia_profiles set ativo=false where id='${admin}'`);
  assert.equal(
    (await como(admin, "select * from franquia_turmas")).rows.length,
    0,
  );
  await assert.rejects(
    como(
      admin,
      "insert into franquia_turmas(franquia_id,nome,curso) values ($1,$2,$3)",
      [unidadeA, "Bloqueada", "Curso"],
    ),
    /row-level security/,
  );
  await db.exec(
    `update franquia_profiles set ativo=true where id='${admin}'; set role anon;`,
  );
  try {
    await assert.rejects(
      db.query("select * from franquia_turmas"),
      /permission denied/,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("valida capacidade, datas e unicidade, preservando histórico ao inativar turma", async () => {
  await assert.rejects(
    como(admin, "update franquia_turmas set capacidade=0 where id=$1", [
      turmaA,
    ]),
    /check constraint/,
  );
  await assert.rejects(
    como(
      admin,
      "update franquia_turmas set data_inicio='2026-10-02',data_fim='2026-10-01' where id=$1",
      [turmaA],
    ),
    /check constraint/,
  );
  await assert.rejects(
    como(
      admin,
      "insert into franquia_turmas(franquia_id,nome,curso) values ($1,$2,$3)",
      [unidadeA, " turma a ", "Curso"],
    ),
    /unique constraint/,
  );
  await assert.rejects(
    como(
      admin,
      "update franquia_dre_lancamentos set data_liquidacao='9999-01-01' where id=$1",
      [legado],
    ),
    /check constraint/,
  );
  await como(admin, "update franquia_turmas set ativo=false where id=$1", [
    turmaA,
  ]);
  assert.equal(
    (
      await como(
        alunoA,
        "select * from franquia_dre_lancamentos where turma_id=$1",
        [turmaA],
      )
    ).rows.length,
    1,
  );
});

test("controle de concorrência detecta edição desatualizada e exclusão mantém auditoria", async () => {
  const anterior = (
    await db.query(
      "select updated_at::text from franquia_dre_lancamentos where id=$1",
      [legado],
    )
  ).rows[0].updated_at;
  await como(
    admin,
    "update franquia_dre_lancamentos set descricao=$1 where id=$2",
    ["Correção", legado],
  );
  const conflito = await como(
    admin,
    "update franquia_dre_lancamentos set valor=5 where id=$1 and updated_at=$2 returning id",
    [legado, anterior],
  );
  assert.equal(conflito.rows.length, 0);
  await como(admin, "delete from franquia_dre_lancamentos where id=$1", [
    legado,
  ]);
  const { rows } = await como(
    admin,
    "select dados_antigos, dados_novos, ator from franquia_audit_log where registro_id=$1 and acao='delete'",
    [legado],
  );
  assert.equal(rows[0].dados_antigos.descricao, "Correção");
  assert.equal(rows[0].dados_novos, null);
  assert.equal(rows[0].ator, admin);
});

test("funil isola leads e histórico por unidade, impede troca de escopo e registra etapas", async () => {
  const lead = "40000000-0000-0000-0000-000000000001";
  await como(alunoA,
    "insert into franquia_leads(id,franquia_id,turma_id,nome,email) values ($1,$2,$3,$4,$5)",
    [lead, unidadeA, turmaA, "Maria", "maria@example.test"]);
  assert.equal((await como(alunoA, "select * from franquia_leads")).rows.length, 1);
  assert.equal((await como(alunoB, "select * from franquia_leads")).rows.length, 0);
  assert.equal((await como(alunoA, "select * from franquia_lead_etapas")).rows.length, 1);
  assert.equal((await como(alunoB, "select * from franquia_lead_etapas")).rows.length, 0);
  await assert.rejects(como(alunoA,
    "insert into franquia_leads(franquia_id,nome,telefone) values ($1,$2,$3)",
    [unidadeB, "Intruso", "11999999999"]), /row-level security/);
  await assert.rejects(como(alunoA,
    "update franquia_leads set franquia_id=$1 where id=$2", [unidadeB, lead]), /imutáveis/);
  await assert.rejects(como(admin,
    "update franquia_leads set turma_id=$1 where id=$2", [turmaB, lead]), /foreign key/);
  await assert.rejects(como(alunoA,
    "update franquia_leads set etapa='perdido' where id=$1", [lead]), /check constraint/);
  await como(alunoA,
    "update franquia_leads set etapa='matricula' where id=$1", [lead]);
  const etapas = (await como(admin,
    "select etapa_anterior,etapa_nova,ator,turma_id from franquia_lead_etapas where lead_id=$1 order by id", [lead])).rows;
  assert.deepEqual(etapas.map((e) => e.etapa_nova), ["lead", "matricula"]);
  assert.equal(etapas[1].ator, alunoA);
  assert.equal(etapas[1].turma_id, turmaA);
  await assert.rejects(como(alunoA,
    "delete from franquia_lead_etapas where lead_id=$1", [lead]), /permission denied/);
});

test("meta mensal é exclusiva do admin, auditada e vinculada à turma correta", async () => {
  await assert.rejects(como(alunoA,
    "insert into franquia_metas_turma(franquia_id,turma_id,competencia,meta_matriculas) values ($1,$2,'2026-10-01',10)",
    [unidadeA, turmaA]), /row-level security/);
  await assert.rejects(como(admin,
    "insert into franquia_metas_turma(franquia_id,turma_id,competencia,meta_matriculas) values ($1,$2,'2026-10-01',10)",
    [unidadeA, turmaB]), /foreign key/);
  await como(admin,
    "insert into franquia_metas_turma(franquia_id,turma_id,competencia,meta_matriculas) values ($1,$2,'2026-10-01',10)",
    [unidadeA, turmaA]);
  assert.equal((await como(alunoA, "select * from franquia_metas_turma")).rows.length, 1);
  assert.equal((await como(alunoB, "select * from franquia_metas_turma")).rows.length, 0);
  assert.equal((await como(admin,
    "select * from franquia_audit_log where tabela='franquia_metas_turma'")).rows.length, 1);
});

test("franqueado não consegue forjar emissão, PDF ou autor de nota fiscal", async () => {
  await assert.rejects(como(alunoA,
    "insert into franquia_notas_fiscais(franquia_id,competencia,valor,status) values ($1,'2026-10-01',100,'emitida')",
    [unidadeA]), /só pode solicitar nota pendente/);
  await assert.rejects(como(alunoA,
    "insert into franquia_notas_fiscais(franquia_id,competencia,valor,solicitado_por) values ($1,'2026-10-01',100,$2)",
    [unidadeA, alunoB]), /só pode solicitar nota pendente/);
  await assert.rejects(como(alunoA,
    "insert into franquia_notas_fiscais(franquia_id,competencia,valor,link_pdf) values ($1,'2026-10-01',100,'https://exemplo.test/falso.pdf')",
    [unidadeA]), /só pode solicitar nota pendente/);
  await assert.rejects(como(alunoA,
    "insert into franquia_notas_fiscais(franquia_id,competencia,valor) values ($1,'2026-10-01',100)",
    [unidadeB]), /row-level security/);
  const criada = await como(alunoA,
    "insert into franquia_notas_fiscais(franquia_id,competencia,valor) values ($1,'2026-10-01',100) returning id,solicitado_por,status",
    [unidadeA]);
  assert.equal(criada.rows[0].solicitado_por, alunoA);
  assert.equal(criada.rows[0].status, "pendente");
  await assert.rejects(como(admin,
    "update franquia_notas_fiscais set link_pdf='javascript:alert(1)' where id=$1",
    [criada.rows[0].id]), /check constraint/);
  await assert.rejects(como(admin,
    "update franquia_notas_fiscais set franquia_id=$1 where id=$2",
    [unidadeB, criada.rows[0].id]), /imutáveis/);
  assert.equal((await como(admin,
    "select * from franquia_audit_log where tabela='franquia_notas_fiscais' and registro_id=$1",
    [criada.rows[0].id])).rows.length, 1);
});

test("captação de compradores de franquia fica invisível a franqueados e auditada", async () => {
  const tabelas = ["franquia_expansao_leads", "franquia_expansao_campanhas", "franquia_expansao_responsaveis"];
  for (const tabela of tabelas) {
    assert.equal((await como(alunoA, `select * from ${tabela}`)).rows.length, 0);
    assert.equal((await como(alunoB, `select * from ${tabela}`)).rows.length, 0);
  }
  await assert.rejects(como(alunoA,
    "insert into franquia_expansao_leads(nome,email) values ('Interessado','interessado@example.test')"), /row-level security/);
  await assert.rejects(como(alunoA,
    "insert into franquia_expansao_campanhas(gasto) values (100)"), /row-level security/);
  const lead = await como(admin,
    "insert into franquia_expansao_leads(nome,email) values ('Interessado','interessado@example.test') returning id");
  await como(admin, "update franquia_expansao_leads set fase='contatado' where id=$1", [lead.rows[0].id]);
  await como(admin, "insert into franquia_expansao_campanhas(gasto,cliques,impressoes,leads_count) values (100,50,1000,4)");
  assert.equal((await como(admin, "select * from franquia_expansao_leads")).rows.length, 1);
  assert.equal((await como(admin, "select cpl,ctr from franquia_expansao_campanhas")).rows[0].cpl, "25.00");
  assert.equal((await como(admin, "select count(*)::int as n from franquia_audit_log where tabela='franquia_expansao_leads'")).rows[0].n, 2);
  await assert.rejects(como(admin, "delete from franquia_expansao_leads"), /permission denied/);
});

test("limite de captura é atômico e inacessível a visitantes e franqueados", async () => {
  await assert.rejects(como(alunoA, "select * from franquia_captura_rate_limits"), /permission denied/);
  await assert.rejects(como(alunoA,
    "select franquia_captura_admitir($1,$2)", ["a".repeat(64), "b".repeat(64)]), /permission denied/);
  await db.exec("set role service_role");
  try {
    for (let n = 0; n < 3; n++) {
      const { rows } = await db.query("select franquia_captura_admitir($1,$2) as admitido",
        ["a".repeat(64), "b".repeat(64)]);
      assert.equal(rows[0].admitido, true);
    }
    assert.equal((await db.query("select franquia_captura_admitir($1,$2) as admitido",
      ["a".repeat(64), "b".repeat(64)])).rows[0].admitido, false);
    assert.equal((await db.query("select franquia_captura_admitir($1,$2) as admitido",
      ["a".repeat(64), "c".repeat(64)])).rows[0].admitido, true);
  } finally {
    await db.exec("reset role");
  }
});

test("social mídia separa franqueadora e unidades no banco", async () => {
  const global = await como(admin,
    "insert into franquia_social_posts(escopo,titulo,criado_por) values ('franqueadora','Corte geral',$1) returning id", [admin]);
  const local = await como(alunoA,
    "insert into franquia_social_posts(escopo,franquia_id,titulo,criado_por) values ('unidade',$1,'Corte da unidade A',$2) returning id", [unidadeA, alunoA]);
  assert.equal((await como(alunoA, "select id from franquia_social_posts")).rows.length, 1);
  assert.equal((await como(alunoB, "select id from franquia_social_posts")).rows.length, 0);
  assert.equal((await como(admin, "select id from franquia_social_posts")).rows.length, 2);
  await assert.rejects(como(alunoA,
    "insert into franquia_social_posts(escopo,titulo,criado_por) values ('franqueadora','Invasão',$1)", [alunoA]), /row-level security/);
  await assert.rejects(como(alunoA,
    "insert into franquia_social_posts(escopo,franquia_id,titulo,criado_por) values ('unidade',$1,'Invasão',$2)", [unidadeB, alunoA]), /row-level security/);
  assert.equal((await como(alunoA,
    "update franquia_social_posts set titulo='Alterado' where id=$1 returning id", [global.rows[0].id])).rows.length, 0);
  assert.equal((await como(alunoA,
    "delete from franquia_social_posts where id=$1 returning id", [global.rows[0].id])).rows.length, 0);
  await assert.rejects(como(alunoA,
    "update franquia_social_posts set franquia_id=$1 where id=$2", [unidadeB, local.rows[0].id]), /row-level security/);
});
