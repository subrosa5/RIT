import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// Mirrors the backend's UserLogin pydantic schema — the email/password
// shape is validated independently on both sides of the API boundary.
const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await apiFetch("/auth/login", { method: "POST", body: data });
      await refresh();
      const from = (location.state as { from?: { pathname: string } } | null)?.from;
      navigate(from?.pathname ?? "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Не удалось войти. Попробуйте ещё раз.");
      }
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-lg font-semibold text-[var(--color-foreground)]">Вход в RIT</h1>
        </CardHeader>
        <CardBody>
          <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
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
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register("password")}
            />
            {serverError && (
              <p role="alert" className="text-sm text-[var(--color-destructive)]">
                {serverError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Входим…" : "Войти"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium text-[var(--color-primary)]">
              Зарегистрироваться
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
