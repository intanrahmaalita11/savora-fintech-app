import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtIDR } from "@/lib/format";
import { ArrowLeft, Moon, Sun, Loader2, Bell, BellRing, Languages } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

type Bud = { period: "daily" | "weekly" | "monthly"; amount: number };

function SettingsPage() {
  const { user } = useAuth();
  const { t, lang, setLang } = useT();
  const nav = useNavigate();
  const [budgets, setBudgets] = useState<Record<string, string>>({ daily: "", weekly: "", monthly: "" });
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    } else {
      setNotifPerm("unsupported");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("budgets")
      .select("period,amount")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const next = { daily: "", weekly: "", monthly: "" } as Record<string, string>;
        for (const b of (data ?? []) as Bud[]) next[b.period] = String(b.amount);
        setBudgets(next);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const periods: ("daily" | "weekly" | "monthly")[] = ["daily", "weekly", "monthly"];
    for (const p of periods) {
      const num = Number(budgets[p].replace(/[^\d]/g, ""));
      if (num > 0) {
        await supabase.from("budgets").upsert(
          { user_id: user.id, period: p, amount: num, updated_at: new Date().toISOString() },
          { onConflict: "user_id,period" },
        );
      } else {
        await supabase.from("budgets").delete().eq("user_id", user.id).eq("period", p);
      }
    }
    setBusy(false);
    toast.success("Limit budget tersimpan ✨");
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("savora-theme", next ? "dark" : "light");
    } catch {}
  };

  const enableNotifications = async () => {
    if (notifPerm === "unsupported") {
      toast.error("Browser kamu belum mendukung notifikasi");
      return;
    }
    if (notifPerm === "granted") {
      new Notification("Savora ✨", {
        body: "Notifikasi aktif! Kami akan ingatkan budget & target tabungan kamu.",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "savora-test",
      });
      return;
    }
    const res = await Notification.requestPermission();
    setNotifPerm(res);
    if (res === "granted") {
      toast.success("Notifikasi diaktifkan 🔔");
      new Notification("Savora ✨ siap menemanimu", {
        body: "Kamu akan dapet pengingat budget, tagihan & target tabungan langsung di layar.",
        icon: "/favicon.ico",
        tag: "savora-welcome",
      });
    } else if (res === "denied") {
      toast.error("Izin notifikasi ditolak. Aktifkan dari pengaturan browser.");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <button onClick={() => nav({ to: "/profile" })} className="no-tap rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-extrabold">{t("settings.title")}</h1>
      </header>

      <div className="card-soft p-5">
        <p className="text-sm font-semibold">{t("settings.theme")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("settings.theme.desc")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          <button
            onClick={() => dark && toggleDark()}
            className={`btn-press flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${!dark ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Sun className="h-4 w-4" /> {t("settings.theme.light")}
          </button>
          <button
            onClick={() => !dark && toggleDark()}
            className={`btn-press flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${dark ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Moon className="h-4 w-4" /> {t("settings.theme.dark")}
          </button>
        </div>
      </div>

      <div className="card-soft p-5">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" /> {t("settings.lang")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("settings.lang.desc")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          <button
            onClick={() => setLang("id")}
            className={`btn-press flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${lang === "id" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            🇮🇩 Indonesia
          </button>
          <button
            onClick={() => setLang("en")}
            className={`btn-press flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${lang === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            🇬🇧 English
          </button>
        </div>
      </div>

      <div className="card-soft p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" /> {t("settings.notif")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("settings.notif.desc")}</p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              notifPerm === "granted"
                ? "bg-primary/15 text-primary"
                : notifPerm === "denied"
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {notifPerm === "granted" ? t("settings.notif.on") : notifPerm === "denied" ? t("settings.notif.blocked") : notifPerm === "unsupported" ? "N/A" : t("settings.notif.off")}
          </span>
        </div>
        <button
          onClick={enableNotifications}
          disabled={notifPerm === "unsupported" || notifPerm === "denied"}
          className="btn-press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {notifPerm === "granted" ? t("settings.notif.test") : t("settings.notif.enable")}
        </button>
        {notifPerm === "denied" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Buka pengaturan situs di browser kamu lalu izinkan notifikasi untuk Savora.
          </p>
        )}
      </div>

      <div className="card-soft p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold">{t("settings.budget")}</p>
          <p className="text-xs text-muted-foreground">{t("settings.budget.desc")}</p>
        </div>
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <label key={p} className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground capitalize">
              {p === "daily" ? t("settings.budget.daily") : p === "weekly" ? t("settings.budget.weekly") : t("settings.budget.monthly")}
              {budgets[p] && Number(budgets[p]) > 0 && (
                <span className="ml-2 text-foreground">{fmtIDR(Number(budgets[p]))}</span>
              )}
            </span>
            <input
              inputMode="numeric"
              value={budgets[p]}
              onChange={(e) => setBudgets({ ...budgets, [p]: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="0"
              className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
            />
          </label>
        ))}
        <button
          onClick={save}
          disabled={busy}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t("settings.budget.save")}
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">Savora ✨ Spend Better, Save Smarter</p>
    </div>
  );
}
