import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { TextField, TextAreaField } from "@/components/ui/Field";
import { SelectField } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ApiError, apiFetch } from "@/lib/api";
import type { Initiative, Region } from "@/types/api";

// Mirrors app/schemas/schemas.py::InitiativeCreate.
const schema = z.object({
  title: z.string().min(4, "Минимум 4 символа").max(300),
  description: z.string().min(20, "Минимум 20 символов").max(8000),
  sphere: z.string().min(2, "Укажите сферу").max(120),
  region_id: z.string().min(1, "Выберите регион"),
});

type FormValues = z.infer<typeof schema>;

export function NewInitiativePage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => apiFetch<Region[]>("/regions"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    try {
      await apiFetch<Initiative>("/initiatives", { method: "POST", body: data });
      navigate("/initiatives", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Не удалось создать инициативу.");
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
          Новая инициатива
        </h1>
      </CardHeader>
      <CardBody>
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <TextField
            label="Название"
            required
            error={errors.title?.message}
            {...register("title")}
          />
          <TextAreaField
            label="Описание"
            required
            error={errors.description?.message}
            {...register("description")}
          />
          <TextField
            label="Сфера"
            placeholder="Например: Здравоохранение"
            required
            error={errors.sphere?.message}
            {...register("sphere")}
          />
          <SelectField label="Регион" required error={errors.region_id?.message} {...register("region_id")}>
            <option value="">Выберите регион</option>
            {(regions ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </SelectField>
          {serverError && (
            <p role="alert" className="text-sm text-[var(--color-destructive)]">
              {serverError}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем…" : "Создать"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Отмена
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
