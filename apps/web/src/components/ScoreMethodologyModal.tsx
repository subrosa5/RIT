import { Modal } from "@/components/ui/Modal";

const heuristicFactors = [
  {
    label: "Базовый балл",
    points: "+15",
    detail: "Стартовое значение — даёт любой заявке ненулевую точку отсчёта.",
  },
  {
    label: "Длина описания",
    points: "до +60",
    detail:
      "Чем подробнее описана инициатива (до 200 слов), тем выше балл — грубая, но честная оценка проработанности.",
  },
  {
    label: "Конкретика",
    points: "+15",
    detail: "Есть ли в тексте цифры и показатели (сроки, охват, бюджет) — признак измеримости.",
  },
  {
    label: "Указана сфера",
    points: "+10",
    detail: "Заполнено ли поле «Сфера» — минимальная полнота заявки.",
  },
];

/** Explains what actually drives the score — reused from the dashboard stat
 * tile and the KPI column header, so "как ИИ оценивает" has one honest
 * answer in one place instead of being implied by a number. */
export function ScoreMethodologyModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Как считается AI-балл" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p>
          Без ключа <code className="rounded bg-[var(--color-muted)] px-1 py-0.5">ANTHROPIC_API_KEY</code>{" "}
          балл считает детерминированная эвристика — четыре слагаемых, без скрытой логики:
        </p>

        <div className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] p-3">
          {heuristicFactors.map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <span className="font-mono-data w-16 shrink-0 text-right text-[var(--color-primary)]">
                {f.points}
              </span>
              <div>
                <p className="font-medium text-slate-800">{f.label}</p>
                <p className="text-xs text-slate-500">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <p>
          Разбивку по каждой конкретной инициативе — с точными очками — можно посмотреть, раскрыв
          её в списке «Инициативы» (клик по названию).
        </p>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
          <p className="font-medium text-slate-800">Если задан ANTHROPIC_API_KEY</p>
          <p className="mt-1 text-xs text-slate-600">
            Баллы и факторы формирует модель — она сама решает, на что опереться (новизна,
            реализуемость, влияние), и присылает свою разбивку в том же формате. Формула выше в
            этом случае не используется.
          </p>
        </div>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-accent)]/10 p-3">
          <p className="font-medium text-slate-800">Важно: балл ≠ статус</p>
          <p className="mt-1 text-xs text-slate-600">
            AI-балл — это рекомендация эксперту, а не решение. Статус «Рекомендована» или
            «Отклонена» всегда выставляет куратор вручную — ИИ не может отклонить инициативу
            самостоятельно.
          </p>
        </div>
      </div>
    </Modal>
  );
}
