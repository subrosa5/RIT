import { useState } from "react";
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
import { motion, type Variants } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreMethodologyModal } from "@/components/ScoreMethodologyModal";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/types/api";

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  in_review: "На рассмотрении",
  recommended: "Рекомендована",
  rejected: "Отклонена",
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
} satisfies Variants;

export function DashboardPage() {
  const [showMethodology, setShowMethodology] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => apiFetch<AnalyticsSummary>("/analytics/summary"),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-panel">
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24 bg-white/40" />
              <Skeleton className="h-8 w-16 bg-white/40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">Не удалось загрузить сводку.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile index={0} label="Всего инициатив" value={data.total_initiatives} />
        <StatTile
          index={1}
          label="Рекомендовано"
          value={data.by_status["recommended"] ?? 0}
          accent="text-emerald-700"
        />
        <StatTile
          index={2}
          label="На рассмотрении"
          value={data.by_status["in_review"] ?? 0}
          accent="text-amber-700"
        />
        <StatTile
          index={3}
          label="Средний AI-балл"
          value={data.avg_kpi_score ?? "—"}
          hint={`оценено ${data.scored_count} из ${data.total_initiatives} · как считается →`}
          onClick={() => setShowMethodology(true)}
        />
      </div>

      <ScoreMethodologyModal open={showMethodology} onOpenChange={setShowMethodology} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-sm">По сферам</CardTitle>
            </CardHeader>
            <CardContent>
              {data.by_sphere.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.by_sphere} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="sphere" width={140} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="var(--color-primary)"
                      radius={[0, 4, 4, 0]}
                      animationDuration={600}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-sm">По регионам</CardTitle>
            </CardHeader>
            <CardContent>
              {data.by_region.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.by_region} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="region" width={140} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="var(--color-accent)"
                      radius={[0, 4, 4, 0]}
                      animationDuration={600}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={6}>
          <Card className="glass-panel h-full">
            <CardHeader>
              <CardTitle className="text-sm">По статусам</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {Object.entries(data.by_status).map(([status, count]) => (
                <div
                  key={status}
                  className="rounded-md border border-border bg-white/50 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{statusLabels[status] ?? status}</span>{" "}
                  <span className="font-mono-data font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={7}>
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-sm">Распределение AI-баллов</CardTitle>
            </CardHeader>
            <CardContent>
              {data.scored_count === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.score_distribution} margin={{ top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="var(--color-secondary)"
                      radius={[4, 4, 0, 0]}
                      animationDuration={600}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function StatTile({
  index,
  label,
  value,
  accent,
  hint,
  onClick,
}: {
  index: number;
  label: string;
  value: number | string;
  accent?: string;
  hint?: string;
  onClick?: () => void;
}) {
  const body = (
    <CardContent>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-mono-data mt-1 text-3xl font-semibold", accent ?? "text-foreground")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  );

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={index}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="glass-panel w-full cursor-pointer rounded-xl text-left transition-transform hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </button>
      ) : (
        <Card className="glass-panel transition-transform hover:-translate-y-0.5">{body}</Card>
      )}
    </motion.div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      Данных пока нет
    </div>
  );
}
