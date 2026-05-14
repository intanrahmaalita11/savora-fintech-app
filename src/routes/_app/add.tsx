import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayISO } from "@/lib/format";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/add")({
  component: AddPage,
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    type: s.type === "income" || s.type === "expense" ? s.type : undefined,
  }),
});

function AddPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { edit, type: initType } = Route.useSearch();

  const [type, setType] = useState<"income" | "expense">(initType ?? "expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!edit);

  useEffect(() => {
    if (!edit || !user) return;
    supabase
      .from("transactions")
      .select("*")
      .eq("id", edit)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setType(data.type);
          setAmount(String(data.amount));
          setCategory(data.category);
          setDate(data.occurred_at);
          setNote(data.note ?? "");
        }
        setLoading(false);
      });
  }, [edit, user]);

  // Reset category if type changes & current isn't valid
  useEffect(() => {
    const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!list.find((c) => c.key === category)) setCategory(list[0].key);
  }, [type, category]);

  const submit = async () => {
    if (!user) return;
    const num = Number(amount.replace(/[^\d.]/g, ""));
    const parsed = z.object({ amount: z.number().positive("Nominal harus lebih dari 0") }).safeParse({ amount: num });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setBusy(true);
    const payload = {
      user_id: user.id,
      type,
      amount: num,
      category,
      occurred_at: date,
      note: note.trim() || null,
    };
    const { error } = edit
      ? await supabase.from("transactions").update(payload).eq("id", edit).eq("user_id", user.id)
      : await supabase.from("transactions").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    await checkBudget(user.id);
    toast.success(edit ? "Transaksi diperbarui ✨" : "Transaksi disimpan 🎉");
    nav({ to: "/transactions" });
  };

  const remove = async () => {
    if (!edit || !user) return;
    if (!confirm("Hapus transaksi ini?")) return;
    setBusy(true);
    const { error } = await supabase.from("transactions").delete().eq("id", edit).eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
    nav({ to: "/transactions" });
  };

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (loading)
    return (
      <div className="grid h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <button onClick={() => nav({ to: "/transactions" })} className="no-tap rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-extrabold">
          {edit ? "Edit transaksi" : "Tambah transaksi"}
        </h1>
        {edit ? (
          <button onClick={remove} className="no-tap rounded-full p-2 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-9" />
        )}
      </header>

      {/* type switch */}
      <div className="card-soft grid grid-cols-2 gap-1 p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`btn-press rounded-2xl py-3 text-sm font-semibold transition ${
              type === t
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground"
            }`}
          >
            {t === "expense" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      {/* amount */}
      <div className="card-soft p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Nominal</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="font-display text-2xl font-bold text-muted-foreground">Rp</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="0"
            className="font-display w-full bg-transparent text-center text-4xl font-extrabold outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      {/* category */}
      <div>
        <p className="mb-2 text-sm font-semibold">Kategori</p>
        <div className="grid grid-cols-4 gap-2">
          {cats.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`btn-press flex flex-col items-center gap-1 rounded-2xl border p-3 text-[11px] font-medium transition ${
                category === c.key
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <span className="text-xl">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-input bg-card px-3 py-3 text-sm outline-none focus:border-ring"
          />
        </Field>
        <Field label="Catatan">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="opsional"
            className="w-full rounded-2xl border border-input bg-card px-3 py-3 text-sm outline-none focus:border-ring"
          />
        </Field>
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {edit ? "Simpan perubahan" : "Simpan transaksi"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// Check monthly budget after each transaction insertion
async function checkBudget(userId: string) {
  const { data: b } = await supabase
    .from("budgets")
    .select("amount")
    .eq("user_id", userId)
    .eq("period", "monthly")
    .maybeSingle();
  if (!b?.amount) return;
  const since = new Date();
  since.setDate(1);
  const { data: txs } = await supabase
    .from("transactions")
    .select("amount,type")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("occurred_at", since.toISOString().slice(0, 10));
  const spent = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const limit = Number(b.amount);
  const pct = (spent / limit) * 100;
  if (pct >= 100) {
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Limit bulanan terlewati 😭",
      body: "Pengeluaran kamu bulan ini sudah melewati batas. Yuk evaluasi & hemat lagi ✨",
      kind: "warning",
    });
  } else if (pct >= 80) {
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Budget hampir habis ⚠️",
      body: `Sudah ${Math.round(pct)}% terpakai dari limit bulanan. Tetap on track ya!`,
      kind: "warning",
    });
  }
}
