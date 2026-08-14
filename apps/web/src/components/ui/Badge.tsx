import type { InitiativeStatus } from "@/types/api";
import { cn } from "@/lib/cn";

const statusMeta: Record<InitiativeStatus, { label: string; className: string }> = {
  draft: { label: "Черновик", className: "bg-slate-100 text-slate-700" },
  in_review: { label: "На рассмотрении", className: "bg-amber-100 text-amber-800" },
  recommended: { label: "Рекомендована", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Отклонена", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: InitiativeStatus }) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}
