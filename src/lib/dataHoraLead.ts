const formato = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

export function dataHoraLead(iso: string | null | undefined): string {
  if (!iso) return "Data indisponível";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "Data indisponível" : formato.format(data);
}
