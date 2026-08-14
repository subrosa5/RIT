import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InitiativeStatus } from "@/types/api";

const statusMeta: Record<InitiativeStatus, { label: string; className: string }> = {
  draft: { label: "Черновик", className: "bg-slate-100 text-slate-700" },
  in_review: { label: "На рассмотрении", className: "bg-amber-100 text-amber-800" },
  recommended: { label: "Рекомендована", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Отклонена", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: InitiativeStatus }) {
  const meta = statusMeta[status];
  return <Badge className={cn(meta.className, "rounded-full")}>{meta.label}</Badge>;
}
