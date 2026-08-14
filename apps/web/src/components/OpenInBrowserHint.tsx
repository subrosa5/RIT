import { useState } from "react";

/**
 * Links opened from inside Telegram/Instagram/etc. render in the host
 * app's own embedded browser — a separate cookie/storage sandbox from the
 * system browser, and one the user can't easily force-refresh. If login
 * silently fails there, the fix isn't something this page can control;
 * the honest move is to hand the visitor a one-tap way out instead of
 * leaving them stuck with no explanation.
 */
export function OpenInBrowserHint() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked inside some embedded browsers —
      // the URL text below is still selectable by hand as a fallback.
    }
  };

  return (
    <div className="mt-4 rounded-md border border-border bg-muted/60 p-3 text-center text-xs text-muted-foreground">
      <p>
        Если вход не срабатывает — вероятно, страница открыта во встроенном браузере
        мессенджера. Откройте ссылку в обычном браузере:
      </p>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="mt-2 cursor-pointer rounded-md border border-border bg-white/70 px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-white"
      >
        {copied ? "Скопировано ✓" : "Скопировать ссылку"}
      </button>
    </div>
  );
}
