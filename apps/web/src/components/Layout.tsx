import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const navItems = [
  { to: "/", label: "Дашборд" },
  { to: "/initiatives", label: "Инициативы" },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <span className="font-mono-data text-sm font-semibold text-[var(--color-foreground)]">
              RIT
            </span>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--color-muted)] text-[var(--color-foreground)]"
                        : "text-slate-600 hover:bg-[var(--color-muted)]",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {user.full_name} · <span className="font-mono-data">{user.role}</span>
              </span>
              <Button variant="ghost" onClick={() => void logout()}>
                Выйти
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
