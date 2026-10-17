-- Unidade fictícia, só pra testar as telas (turmas, financeiro, notas).
-- Inativa por padrão para não aparecer na contagem de franquias em operação.
insert into public.franquias (nome, cidade, estado, ativo)
select 'IDM PSI — Unidade Teste', 'São Paulo', 'SP', false
where not exists (
  select 1 from public.franquias where nome = 'IDM PSI — Unidade Teste'
);
