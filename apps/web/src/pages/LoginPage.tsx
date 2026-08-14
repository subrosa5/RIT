import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/Field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex min-h-dvh items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <Card className="glass-panel-strong">
          <CardHeader>
            <CardTitle className="text-lg">Вход в RIT</CardTitle>
          </CardHeader>
          <CardContent>
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
                <p role="alert" className="text-sm text-destructive">
                  {serverError}
                </p>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Входим…" : "Войти"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link to="/register" className="font-medium text-primary">
                Зарегистрироваться
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
