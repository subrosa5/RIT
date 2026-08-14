import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { AuditEntry, Initiative } from "@/types/api";

const actionLabels: Record<string, string> = {
  create: "Создана",
  update: "Изменена",
  score: "Оценена ИИ",
  delete: "Удалена",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The expanded panel under a row — full description, the AI score's factor
 * breakdown (not just the number), and the audit trail. The point of all
 * three together: nothing about how an initiative got its status should be
 * invisible to the person reading it. */
export function InitiativeDetail({
  initiative,
  canManage,
}: {
  initiative: Initiative;
  canManage: boolean;
}) {
  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["initiative-audit", initiative.id],
    queryFn: () => apiFetch<AuditEntry[]>(`/initiatives/${initiative.id}/audit`),
  });

  const maxPoints = Math.max(1, ...(initiative.score_factors ?? []).map((f) => Math.abs(f.points)));

  return (
    <div className="grid grid-cols-1 gap-6 text-sm lg:grid-cols-3">
      <div className="lg:col-span-2">
        {initiative.status === "rejected" && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="font-medium text-destructive">Статус «Отклонена» — решение куратора</p>
            <p className="mt-1 text-xs text-destructive/80">
              ИИ не отклоняет инициативы сам — он только предлагает балл и заключение ниже.
              Финальное решение принял человек; посмотрите AI-заключение и разбивку балла, чтобы
              понять, чем куратор мог руководствоваться.
            </p>
          </div>
        )}

        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Описание
        </p>
        <p className="mb-4 text-foreground/90">{initiative.description}</p>

        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          AI-заключение
        </p>
        {initiative.ai_summary ? (
          <p className="mb-4 rounded-md border border-border bg-white/70 p-3 text-foreground/90">
            {initiative.ai_summary}
          </p>
        ) : (
          <p className="mb-4 text-muted-foreground">
            Ещё не оценено — {canManage ? "нажмите «Оценить» выше" : "ожидает куратора"}.
          </p>
        )}

        {initiative.score_factors && initiative.score_factors.length > 0 && (
          <>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              На чём основан балл
            </p>
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-white/70 p-3">
              {initiative.score_factors.map((factor, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-foreground/90">{factor.label}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.max(4, (Math.abs(factor.points) / maxPoints) * 100)}%` }}
                    />
                  </div>
                  <div className="font-mono-data w-12 shrink-0 text-right text-foreground/90">
                    {factor.points > 0 ? "+" : ""}
                    {factor.points}
                  </div>
                  <div
                    className="w-48 shrink-0 truncate text-xs text-muted-foreground"
                    title={factor.detail}
                  >
                    {factor.detail}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          История изменений
        </p>
        {auditLoading ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : !audit || audit.length === 0 ? (
          <p className="text-muted-foreground">Нет записей.</p>
        ) : (
          <ol className="flex flex-col gap-3 border-l border-border pl-4">
            {audit.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="font-medium text-foreground">
                  {actionLabels[entry.action] ?? entry.action}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.actor_name} · {formatDateTime(entry.created_at)}
                </p>
                {entry.detail && (
                  <p className="font-mono-data mt-0.5 text-xs text-muted-foreground">
                    {entry.detail}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
