import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/Field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenInBrowserHint } from "@/components/OpenInBrowserHint";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// Mirrors app/schemas/schemas.py::UserRegister on the backend, including the
// "not purely letters or purely digits" rule — validated independently on
// both sides, not shared at runtime.
const registerSchema = z.object({
  email: z.string().email("Введите корректный email"),
  full_name: z.string().min(2, "Минимум 2 символа").max(255),
  password: z
    .string()
    .min(10, "Минимум 10 символов")
    .max(128)
    .refine((v) => !/^\d+$/.test(v) && !/^[a-zA-Zа-яА-Я]+$/.test(v), {
      message: "Пароль должен содержать и буквы, и цифры",
    }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      await apiFetch("/auth/register", { method: "POST", body: data });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.status === 409 ? "Такой email уже зарегистрирован" : err.message);
      } else {
        setServerError("Не удалось зарегистрироваться. Попробуйте ещё раз.");
      }
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle className="text-lg">Регистрация</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
              <TextField
                label="Имя"
                autoComplete="name"
                required
                error={errors.full_name?.message}
                {...register("full_name")}
              />
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register("email")}
              />
              <TextField
                label="Пароль"
                type="password"
                autoComplete="new-password"
                required
                hint="Минимум 10 символов, буквы и цифры"
                error={errors.password?.message}
                {...register("password")}
              />
              {serverError && (
                <p role="alert" className="text-sm text-destructive">
                  {serverError}
                </p>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Регистрируем…" : "Зарегистрироваться"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="font-medium text-primary">
                Войти
              </Link>
            </p>
            <OpenInBrowserHint />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
