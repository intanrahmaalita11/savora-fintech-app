import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtIDR } from "@/lib/format";
import { ArrowLeft, Moon, Sun, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

type Bud = { period: "daily" | "weekly" | "monthly"; amount: number };

function SettingsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [budgets, setBudgets] = useState<Record<string, string>>({ daily: "", weekly: "", monthly: "" });
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
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

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <button onClick={() => nav({ to: "/profile" })} className="no-tap rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-extrabold">Pengaturan</h1>
      </header>

      <div className="card-soft p-5">
        <p className="text-sm font-semibold">Tampilan</p>
        <button
          onClick={toggleDark}
          className="btn-press mt-3 flex w-full items-center justify-between rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
        >
          <span className="flex items-center gap-2">
            {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Mode {dark ? "gelap" : "terang"}
          </span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Tap untuk ubah</span>
        </button>
      </div>

      <div className="card-soft p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold">Limit budget</p>
          <p className="text-xs text-muted-foreground">Atur batas pengeluaran kamu agar tetap on track ✨</p>
        </div>
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <label key={p} className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground capitalize">
              Limit {p === "daily" ? "harian" : p === "weekly" ? "mingguan" : "bulanan"}
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
          className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan limit
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">Savora ✨ Spend Better, Save Smarter</p>
    </div>
  );
}
