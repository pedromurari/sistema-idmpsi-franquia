# Lê do Supabase do CRM interno e insere no Supabase da franquia, sem gravar
# nomes/telefones no repositório ou exibi-los no terminal.
$ErrorActionPreference = 'Stop'
function Invoke-SupabaseCli([string[]]$Argumentos) {
  # O CLI escreve progresso de conexão em stderr mesmo quando a consulta passa.
  $preferenciaAnterior = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $resultado = (& supabase.cmd @Argumentos 2>$null) -join "`n"
    $codigo = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $preferenciaAnterior
  }
  if ($codigo -ne 0) { throw 'Consulta ao Supabase falhou.' }
  return $resultado
}
$origem = 'E:\onze-digital-main'
$destino = 'E:\idmpc-franqueadora'
$arquivoTemporario = Join-Path ([System.IO.Path]::GetTempPath()) ("franquia-expansao-" + [guid]::NewGuid().ToString('N') + '.sql')
try {
  if ((Get-Content (Join-Path $origem 'supabase/.temp/project-ref') -Raw).Trim() -ne 'usqiyekfmwwnvkmkdlej') { throw 'Projeto de origem inesperado.' }
  if ((Get-Content (Join-Path $destino 'supabase/.temp/project-ref') -Raw).Trim() -ne 'bremvrsjmnsvtpgcsgtj') { throw 'Projeto de destino inesperado.' }
  Push-Location $origem
  try {
    $saida = Invoke-SupabaseCli @('db','query','--linked','--output-format','json','select id,nome,whatsapp,email,cidade,estado,fase,vendedor_id,observacoes,dados_extras,created_at,updated_at from public.franquia_leads order by id')
    $inicio = $saida.IndexOf('{')
    if ($inicio -lt 0) { throw 'Resposta inesperada da origem.' }
    $registros = @((($saida.Substring($inicio) | ConvertFrom-Json).rows))
  } finally { Pop-Location }
  if ($registros.Count -eq 0) { Write-Output 'Nenhum lead histórico encontrado.'; exit 0 }
  $json = ConvertTo-Json -InputObject $registros -Depth 30 -Compress
  $base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
  $sql = @"
begin;
with origem as (
  select * from jsonb_to_recordset(convert_from(decode('$base64','base64'),'UTF8')::jsonb)
    as d(id uuid,nome text,whatsapp text,email text,cidade text,estado text,fase text,
         vendedor_id uuid,observacoes text,dados_extras jsonb,created_at timestamptz,updated_at timestamptz)
)
insert into public.franquia_expansao_leads
  (origem_id,nome,whatsapp,email,cidade,estado,fase,responsavel_id,observacoes,dados_extras,origem,created_at,updated_at)
select d.id,btrim(d.nome),nullif(btrim(d.whatsapp),''),nullif(lower(btrim(d.email)),''),
  nullif(btrim(d.cidade),''),nullif(btrim(d.estado),''),d.fase,
  case when d.vendedor_id='cac2f265-196c-4a40-98e4-55d661ddd648'::uuid
    then (select id from public.franquia_expansao_responsaveis where nome='Rodrygo') else null end,
  d.observacoes,coalesce(d.dados_extras,'{}'::jsonb) ||
    case when d.vendedor_id is null then '{}'::jsonb else jsonb_build_object('crm_vendedor_id',d.vendedor_id) end,
  'crm_onze',d.created_at,d.updated_at
from origem d
on conflict (origem_id) do nothing;
commit;
"@
  [System.IO.File]::WriteAllText($arquivoTemporario, $sql, [System.Text.UTF8Encoding]::new($false))
  Push-Location $destino
  try {
    $saidaDestino = Invoke-SupabaseCli @('db','query','--linked','--file',$arquivoTemporario)
    $contagem = Invoke-SupabaseCli @('db','query','--linked','--output-format','json',"select count(*) as total from public.franquia_expansao_leads where origem='crm_onze'")
    $inicio = $contagem.IndexOf('{')
    $total = [int](($contagem.Substring($inicio) | ConvertFrom-Json).rows[0].total)
    if ($total -ne $registros.Count) { throw "Contagem divergente: origem $($registros.Count), destino $total." }
    Write-Output "Transferência conferida: $total leads no destino. A origem foi preservada."
  } finally { Pop-Location }
} finally {
  if (Test-Path -LiteralPath $arquivoTemporario) { Remove-Item -LiteralPath $arquivoTemporario -Force }
}
