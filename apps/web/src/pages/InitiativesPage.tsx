import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { InitiativeDetail } from "@/components/InitiativeDetail";
import { ScoreMethodologyModal } from "@/components/ScoreMethodologyModal";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Initiative, InitiativeScoreOut, Region } from "@/types/api";

const columnHelper = createColumnHelper<Initiative>();
const ALL = "__all__";

export function InitiativesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sphereFilter, setSphereFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

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
    mutationFn: (id: string) =>
      apiFetch<InitiativeScoreOut>(`/initiatives/${id}/score`, { method: "POST" }),
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
      columnHelper.accessor("title", {
        header: "Название",
        cell: (info) => (
          <button
            type="button"
            className="cursor-pointer text-left font-medium text-foreground hover:underline"
            onClick={() =>
              setExpandedId((id) => (id === info.row.original.id ? null : info.row.original.id))
            }
          >
            {info.getValue()}
          </button>
        ),
      }),
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
        header: () => (
          <span className="inline-flex items-center gap-1">
            KPI
            <button
              type="button"
              onClick={() => setShowMethodology(true)}
              aria-label="Как считается AI-балл"
              title="Как считается AI-балл"
              className="cursor-pointer rounded-full text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M8 7.2v4M8 5.1v.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ),
        cell: (info) => <span className="font-mono-data">{info.getValue() ?? "—"}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) =>
          canManage ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => scoreMutation.mutate(info.row.original.id)}
                disabled={scoreMutation.isPending}
              >
                Оценить
              </Button>
              <Button
                variant="destructive"
                size="sm"
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
          <div className="flex flex-col gap-1.5">
            <Label>Сфера</Label>
            <Select
              value={sphereFilter || ALL}
              onValueChange={(v) => setSphereFilter(v === ALL ? "" : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все сферы</SelectItem>
                {spheres.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Регион</Label>
            <Select
              value={regionFilter || ALL}
              onValueChange={(v) => setRegionFilter(v === ALL ? "" : v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все регионы</SelectItem>
                {(regions ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Link to="/initiatives/new">
          <Button>Новая инициатива</Button>
        </Link>
      </div>

      <Card className="glass-panel">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full bg-white/40" />
            ))}
          </div>
        ) : (initiatives ?? []).length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Инициатив пока нет — создайте первую.
          </p>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-normal">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  <AnimatePresence>
                    {expandedId === row.original.id && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden bg-muted/60"
                          >
                            <div className="px-4 py-4">
                              <InitiativeDetail initiative={row.original} canManage={canManage} />
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ScoreMethodologyModal open={showMethodology} onOpenChange={setShowMethodology} />
    </div>
  );
}
