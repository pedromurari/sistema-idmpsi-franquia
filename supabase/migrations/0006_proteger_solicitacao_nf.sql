-- O cliente não pode declarar uma solicitação como nota emitida, escolher
-- número/PDF ou atribuir a solicitação a outro usuário. Aplicar após 0005.
begin;

alter table public.franquia_notas_fiscais
  add constraint nf_valor_positivo check (valor > 0),
  add constraint nf_competencia_mensal check (extract(day from competencia) = 1),
  add constraint nf_pdf_https check (link_pdf is null or link_pdf ~ '^https://[^[:space:]]+$');

create or replace function public.franquia_nf_protege_escrita()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.franquia_is_franqueador() then
      if new.status <> 'pendente' or new.numero is not null
         or new.data_emissao is not null or new.link_pdf is not null
         or (new.solicitado_por is not null and new.solicitado_por <> auth.uid()) then
        raise exception 'franqueado só pode solicitar nota pendente em seu nome';
      end if;
      new.solicitado_por := auth.uid();
    end if;
  elsif new.id <> old.id or new.franquia_id <> old.franquia_id
        or new.solicitado_por is distinct from old.solicitado_por
        or new.created_at is distinct from old.created_at then
    raise exception 'identidade e unidade da nota são imutáveis';
  end if;
  return new;
end;
$$;
create trigger trg_nf_protege_escrita before insert or update on public.franquia_notas_fiscais
  for each row execute function public.franquia_nf_protege_escrita();

drop policy "franqueado solicita nota da propria unidade" on public.franquia_notas_fiscais;
create policy "franqueador registra nota" on public.franquia_notas_fiscais
  for insert to authenticated with check (public.franquia_is_franqueador());
create policy "franqueado solicita apenas pendente" on public.franquia_notas_fiscais
  for insert to authenticated with check (
    franquia_id = public.franquia_minha_unidade()
    and solicitado_por = auth.uid()
    and status = 'pendente' and numero is null
    and data_emissao is null and link_pdf is null
  );

commit;
