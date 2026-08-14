import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { SelectField } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Initiative, InitiativeScoreOut, Region } from "@/types/api";

const columnHelper = createColumnHelper<Initiative>();

export function InitiativesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sphereFilter, setSphereFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  const canManage = user?.role === "curator" || user?.role === "admin";

  const params = new URLSearchParams();
  if (sphereFilter) params.set("sphere", sphereFilter);
  if (regionFilter) params.set("region_id", regionFilter);
  const query = params.toString();

  const { data: initiatives, isLoading } = useQuery({
    queryKey: ["initiatives", sphereFilter, regionFilter],
    queryFn: () => apiFetch<Initiative[]>(`/initiatives${query ? `?${query}` : ""}`),
  });

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => apiFetch<Region[]>("/regions"),
  });

  const scoreMutation = useMutation({
    mutationFn: (id: string) => apiFetch<InitiativeScoreOut>(`/initiatives/${id}/score`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["initiatives"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/initiatives/${id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["initiatives"] }),
  });

  const spheres = useMemo(
    () => Array.from(new Set((initiatives ?? []).map((i) => i.sphere))).sort(),
    [initiatives],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", { header: "Название" }),
      columnHelper.accessor((row) => row.region.name, {
        id: "region",
        header: "Регион",
      }),
      columnHelper.accessor("sphere", { header: "Сфера" }),
      columnHelper.accessor("status", {
        header: "Статус",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("kpi_score", {
        header: "KPI",
        cell: (info) => (
          <span className="font-mono-data">{info.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) =>
          canManage ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => scoreMutation.mutate(info.row.original.id)}
                disabled={scoreMutation.isPending}
              >
                Оценить
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Удалить «${info.row.original.title}»?`)) {
                    deleteMutation.mutate(info.row.original.id);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                Удалить
              </Button>
            </div>
          ) : null,
      }),
    ],
    [canManage, scoreMutation, deleteMutation],
  );

  const table = useReactTable({
    data: initiatives ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <SelectField
            label="Сфера"
            value={sphereFilter}
            onChange={(e) => setSphereFilter(e.target.value)}
            className="min-w-48"
          >
            <option value="">Все сферы</option>
            {spheres.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Регион"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="min-w-48"
          >
            <option value="">Все регионы</option>
            {(regions ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </SelectField>
        </div>
        <Link to="/initiatives/new">
          <Button>Новая инициатива</Button>
        </Link>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Загрузка…</p>
        ) : (initiatives ?? []).length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Инициатив пока нет — создайте первую.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-2.5 font-medium text-slate-600">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-border)] last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
