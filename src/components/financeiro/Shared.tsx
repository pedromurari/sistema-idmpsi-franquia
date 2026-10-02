import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Adaptado de crm/ui/premium.tsx: mesma hierarquia e paleta, sem dependências do CRM.
export const cabecalhoTabela =
  "bg-primary/10 [&_th]:text-primary [&_th]:font-semibold";
export function Indicador({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4 border-primary/15">
      <p className="text-xs font-semibold uppercase text-primary">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}
export function ErroCarregamento({ retry }: { retry: () => void }) {
  return (
    <Card className="p-6 space-y-3" role="alert">
      <p>
        Não foi possível carregar os dados. Tente novamente. Se o erro
        continuar, contate a administração.
      </p>
      <Button variant="outline" onClick={retry}>
        Tentar novamente
      </Button>
    </Card>
  );
}
export function Campo({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
export const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
