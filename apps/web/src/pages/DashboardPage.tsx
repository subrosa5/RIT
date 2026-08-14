import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import type { AnalyticsSummary } from "@/types/api";

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  in_review: "На рассмотрении",
  recommended: "Рекомендована",
  rejected: "Отклонена",
};

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => apiFetch<AnalyticsSummary>("/analytics/summary"),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Загрузка…</p>;
  if (error || !data) {
    return <p className="text-sm text-[var(--color-destructive)]">Не удалось загрузить сводку.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Всего инициатив" value={data.total_initiatives} />
        <StatTile
          label="Рекомендовано"
          value={data.by_status["recommended"] ?? 0}
          accent="text-emerald-700"
        />
        <StatTile
          label="На рассмотрении"
          value={data.by_status["in_review"] ?? 0}
          accent="text-amber-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">По сферам</h2>
          </CardHeader>
          <CardBody>
            {data.by_sphere.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.by_sphere} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="sphere"
                    width={140}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">По регионам</h2>
          </CardHeader>
          <CardBody>
            {data.by_region.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.by_region} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="region" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">По статусам</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-3">
          {Object.entries(data.by_status).map(([status, count]) => (
            <div
              key={status}
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <span className="text-slate-600">{statusLabels[status] ?? status}</span>{" "}
              <span className="font-mono-data font-semibold text-[var(--color-foreground)]">
                {count}
              </span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`font-mono-data mt-1 text-3xl font-semibold ${accent ?? "text-[var(--color-foreground)]"}`}>
          {value}
        </p>
      </CardBody>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-slate-400">
      Данных пока нет
    </div>
  );
}
