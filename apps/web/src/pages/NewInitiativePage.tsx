import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { TextField, TextAreaField } from "@/components/ui/Field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, isLoading: authLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => apiFetch<Region[]>("/regions"),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { region_id: "" } });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    try {
      await apiFetch<Initiative>("/initiatives", { method: "POST", body: data });
      navigate("/initiatives", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Не удалось создать инициативу.");
    }
  };

  if (!authLoading && !user) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-panel-strong mx-auto max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Подать инициативу может только вошедший пользователь.
            </p>
            <Button asChild>
              <Link to="/login" state={{ from: { pathname: "/initiatives/new" } }}>
                Войти
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="glass-panel-strong mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Новая инициатива</CardTitle>
        </CardHeader>
        <CardContent>
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="region_id">
                Регион <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="region_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="region_id" className="w-full">
                      <SelectValue placeholder="Выберите регион" />
                    </SelectTrigger>
                    <SelectContent>
                      {(regions ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.region_id && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.region_id.message}
                </p>
              )}
            </div>

            {serverError && (
              <p role="alert" className="text-sm text-destructive">
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
