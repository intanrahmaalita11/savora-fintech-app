import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtIDR, categoryMeta } from "@/lib/format";
import { Search, Filter, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/transactions")({ component: TxPage });

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  occurred_at: string;
  note: string | null;
};

function TxPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false });
      setTxs((data ?? []) as Tx[]);
    };
    load();
    const ch = supabase
      .channel("tx-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (!q) return true;
      const meta = categoryMeta(t.type, t.category);
      const hay = `${meta.label} ${t.note ?? ""} ${t.amount}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [txs, q, filter]);

  // group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const t of filtered) {
      const k = t.occurred_at;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const remove = async (id: string) => {
    if (!user) return;
    if (!confirm("Hapus transaksi?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Transaksi</h1>
        <button
          onClick={() => nav({ to: "/add" })}
          className="btn-press grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="card-soft flex items-center gap-2 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kategori, catatan, nominal..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "income", "expense"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn-press whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <Empty
          title="Belum ada transaksi"
          desc="Mulai catat pemasukan & pengeluaranmu sekarang ✨"
          cta={
            <Link
              to="/add"
              className="btn-press inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Tambah transaksi
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => {
            const total = items.reduce(
              (s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
              0,
            );
            return (
              <div key={date}>
                <div className="mb-2 flex items-center justify-between px-1 text-xs">
                  <span className="font-medium text-muted-foreground">
                    {new Date(date).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <span
                    className={`font-semibold ${total >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {total >= 0 ? "+" : "−"} {fmtIDR(Math.abs(total))}
                  </span>
                </div>
                <ul className="card-soft divide-y divide-border/60 overflow-hidden">
                  {items.map((t) => {
                    const meta = categoryMeta(t.type, t.category);
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <Link
                          to="/add"
                          search={{ edit: t.id }}
                          className="no-tap flex flex-1 items-center gap-3"
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-base">
                            {meta.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{meta.label}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {t.note ?? "—"}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-semibold ${t.type === "income" ? "text-success" : "text-foreground"}`}
                          >
                            {t.type === "income" ? "+" : "−"} {fmtIDR(Number(t.amount))}
                          </span>
                        </Link>
                        <button
                          onClick={() => remove(t.id)}
                          className="no-tap rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ title, desc, cta }: { title: string; desc: string; cta?: React.ReactNode }) {
  return (
    <div className="card-soft flex flex-col items-center gap-3 p-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-3xl">📒</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {cta}
    </div>
  );
}
