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
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
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
});
after(async () => {
  await db.close();
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
