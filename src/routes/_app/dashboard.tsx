import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtIDR, fmtShort, startOfMonth, categoryMeta } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet, Target, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  occurred_at: string;
  note: string | null;
};

function Dashboard() {
  const { user, profile } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [allTxs, setAllTxs] = useState<Tx[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [goalsTotal, setGoalsTotal] = useState({ saved: 0, target: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const since = startOfMonth();
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false });
      setTxs((data ?? []) as Tx[]);

      const { data: all } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id);
      setAllTxs((all ?? []) as Tx[]);

      const { data: b } = await supabase
        .from("budgets")
        .select("amount")
        .eq("user_id", user.id)
        .eq("period", "monthly")
        .maybeSingle();
      setBudget(b?.amount ? Number(b.amount) : null);

      const { data: g } = await supabase
        .from("savings_goals")
        .select("saved_amount,target_amount")
        .eq("user_id", user.id);
      const sum = (g ?? []).reduce(
        (acc, x) => ({
          saved: acc.saved + Number(x.saved_amount),
          target: acc.target + Number(x.target_amount),
        }),
        { saved: 0, target: 0 },
      );
      setGoalsTotal(sum);
    };
    load();

    const ch = supabase
      .channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_goals", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const monthlyIncome = useMemo(
    () => txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
    [txs],
  );
  const monthlyExpense = useMemo(
    () => txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    [txs],
  );
  const totalBalance = useMemo(
    () =>
      allTxs.reduce(
        (s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
        0,
      ),
    [allTxs],
  );

  // 14-day chart
  const chartData = useMemo(() => {
    const days: { d: string; income: number; expense: number; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const iso = dt.toISOString().slice(0, 10);
      days.push({ d: iso, income: 0, expense: 0, label: dt.getDate().toString() });
    }
    const map = new Map(days.map((x) => [x.d, x] as const));
    for (const t of allTxs) {
      const x = map.get(t.occurred_at);
      if (x) {
        if (t.type === "income") x.income += Number(t.amount);
        else x.expense += Number(t.amount);
      }
    }
    return days;
  }, [allTxs]);

  const budgetPct = budget && budget > 0 ? Math.min(100, (monthlyExpense / budget) * 100) : 0;
  const budgetWarn = budgetPct >= 80;

  const recent = txs.slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <h1 className="font-display text-xl font-extrabold">
            {profile?.display_name ?? "Friend"} ✨
          </h1>
        </div>
        <Link to="/profile" className="no-tap">
          <Avatar url={profile?.avatar_url} name={profile?.display_name ?? "U"} />
        </Link>
      </header>

      {/* Hero balance */}
      <div
        className="card-soft relative overflow-hidden p-5 text-primary-foreground"
        style={{ background: "linear-gradient(135deg, var(--sage), var(--sage-deep))" }}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <p className="text-xs uppercase tracking-wider opacity-80">Total saldo</p>
        <p className="font-display mt-1 text-3xl font-extrabold">{fmtIDR(totalBalance)}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniStat
            icon={<ArrowDownLeft className="h-4 w-4" />}
            label="Pemasukan"
            value={fmtIDR(monthlyIncome)}
          />
          <MiniStat
            icon={<ArrowUpRight className="h-4 w-4" />}
            label="Pengeluaran"
            value={fmtIDR(monthlyExpense)}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Sisa bulan ini"
          value={fmtIDR(monthlyIncome - monthlyExpense)}
          tone="default"
        />
        <Link to="/savings" className="no-tap">
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Tabungan"
            value={
              goalsTotal.target > 0
                ? `${Math.round((goalsTotal.saved / goalsTotal.target) * 100)}% tercapai`
                : "Buat target"
            }
            tone="default"
          />
        </Link>
      </div>

      {/* Budget */}
      <div className="card-soft p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Budget bulanan</p>
            <p className="text-xs text-muted-foreground">
              {budget ? `${fmtIDR(monthlyExpense)} / ${fmtIDR(budget)}` : "Belum diatur"}
            </p>
          </div>
          <Link
            to="/settings"
            className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
          >
            {budget ? "Atur" : "Set limit"}
          </Link>
        </div>
        {budget && (
          <>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${budgetPct}%`,
                  background:
                    budgetPct >= 100
                      ? "var(--destructive)"
                      : budgetPct >= 80
                        ? "var(--warning)"
                        : "linear-gradient(90deg,var(--sage),var(--sage-deep))",
                }}
              />
            </div>
            {budgetWarn && (
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                {budgetPct >= 100
                  ? "Limit terlewati 😭 yuk evaluasi pengeluaran"
                  : "Hampir habis ✨ hemat sedikit lagi yuk"}
              </p>
            )}
          </>
        )}
      </div>

      {/* Chart */}
      <div className="card-soft p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Aktivitas 14 hari</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
            <TrendingUp className="h-3 w-3" /> Realtime
          </span>
        </div>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gIn" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--sage)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--sage)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEx" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 12,
                }}
                formatter={(v: number) => fmtShort(v)}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="var(--sage)"
                strokeWidth={2.2}
                fill="url(#gIn)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="var(--warning)"
                strokeWidth={2.2}
                fill="url(#gEx)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent */}
      <div className="card-soft p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Transaksi terakhir</p>
          <Link to="/transactions" className="text-xs font-semibold text-primary">
            Lihat semua
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyMini label="Belum ada transaksi bulan ini ✨" />
        ) : (
          <ul className="space-y-2">
            {recent.map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[11px] opacity-80">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}

function TxRow({ t }: { t: Tx }) {
  const meta = categoryMeta(t.type, t.category);
  const sign = t.type === "income" ? "+" : "−";
  return (
    <Link
      to="/add"
      search={{ edit: t.id }}
      className="no-tap flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-accent/40"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-base">
        {meta.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{meta.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {t.note ?? new Date(t.occurred_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </p>
      </div>
      <span
        className={`text-sm font-semibold ${t.type === "income" ? "text-success" : "text-foreground"}`}
      >
        {sign} {fmtIDR(Number(t.amount))}
      </span>
    </Link>
  );
}

function EmptyMini({ label }: { label: string }) {
  return <div className="py-6 text-center text-sm text-muted-foreground">{label}</div>;
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  if (url)
    return <img src={url} alt={name} className="h-11 w-11 rounded-2xl object-cover shadow" />;
  return (
    <div
      className="grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold text-primary-foreground shadow"
      style={{ background: "linear-gradient(135deg, var(--sage), var(--sage-deep))" }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
