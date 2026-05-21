import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtIDR } from "@/lib/format";
import { Plus, Trash2, Minus, X, Loader2, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/savings")({ component: SavingsPage });

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
  emoji: string | null;
};

const EMOJIS = ["🎯", "💰", "🏝️", "🛵", "📱", "💍", "🏠", "🎓", "🎮", "✈️"];

type GroupRow = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  emoji: string | null;
  deadline: string | null;
  owner_id: string;
};

function SavingsPage() {
  const { user } = useAuth();
  const { t } = useT();
  const [tab, setTab] = useState<"personal" | "group">("personal");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [contrib, setContrib] = useState<{ goal: Goal; mode: "add" | "sub" } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setGoals((data ?? []) as Goal[]);
    };
    load();
    const ch = supabase
      .channel("sg")
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_goals", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("group_savings")
        .select("*")
        .order("created_at", { ascending: false });
      setGroups((data ?? []) as GroupRow[]);
    };
    load();
    const ch = supabase
      .channel("gs-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_savings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const remove = async (id: string) => {
    if (!user) return;
    if (!confirm("Hapus target tabungan?")) return;
    const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Target dihapus");
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">{t("savings.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("savings.subtitle")}</p>
        </div>
        <button
          onClick={() => (tab === "personal" ? setShowNew(true) : setShowNewGroup(true))}
          className="btn-press grid h-10 w-10 place-items-center rounded-full bg-brand text-primary-foreground shadow-lg"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {(["personal", "group"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`btn-press rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {s === "personal" ? t("savings.tab.personal") : t("savings.tab.group")}
          </button>
        ))}
      </div>

      {tab === "personal" && (goals.length === 0 ? (
        <div className="card-soft flex flex-col items-center gap-3 p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-3xl">🎯</div>
          <h3 className="text-base font-semibold">{t("savings.empty.personal")}</h3>
          <p className="text-sm text-muted-foreground">{t("savings.empty.desc")}</p>
          <button
            onClick={() => setShowNew(true)}
            className="btn-press rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("savings.create")}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const pct = Math.min(100, (Number(g.saved_amount) / Number(g.target_amount)) * 100);
            const done = pct >= 100;
            return (
              <li key={g.id} className="card-soft p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-2xl">
                      {g.emoji ?? "🎯"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtIDR(Number(g.saved_amount))} / {fmtIDR(Number(g.target_amount))}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(g.id)}
                    className="no-tap rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: done
                        ? "linear-gradient(90deg, var(--gold), var(--coral))"
                        : "linear-gradient(90deg, var(--sage), var(--emerald))",
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{Math.round(pct)}% tercapai</span>
                  {g.deadline && (
                    <span className="text-muted-foreground">
                      Deadline {new Date(g.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContrib({ goal: g, mode: "add" })}
                    className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-brand py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" /> Tambah
                  </button>
                  <button
                    onClick={() => setContrib({ goal: g, mode: "sub" })}
                    className="btn-press flex items-center justify-center gap-1.5 rounded-2xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground"
                  >
                    <Minus className="h-4 w-4" /> Kurangi
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ))}

      {tab === "group" && (groups.length === 0 ? (
        <div className="card-soft flex flex-col items-center gap-3 p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-mint text-3xl text-primary-foreground"><Users className="h-7 w-7" /></div>
          <h3 className="text-base font-semibold">{t("savings.empty.group")}</h3>
          <p className="text-sm text-muted-foreground">Ajak teman nabung bareng untuk liburan, kado, atau impian bersama</p>
          <button
            onClick={() => setShowNewGroup(true)}
            className="btn-press rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("savings.create.group")}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const pct = Math.min(100, (Number(g.saved_amount) / Number(g.target_amount)) * 100);
            return (
              <li key={g.id}>
                <Link to="/groups/$id" params={{ id: g.id }} className="card-soft block p-5 no-tap">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-2xl text-primary-foreground">
                      {g.emoji ?? "🏝️"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtIDR(Number(g.saved_amount))} / {fmtIDR(Number(g.target_amount))}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--gradient-brand)" }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ))}

      {showNew && <NewGoalSheet onClose={() => setShowNew(false)} />}
      {showNewGroup && <NewGroupSheet onClose={() => setShowNewGroup(false)} />}
      {contrib && (
        <ContribSheet
          goal={contrib.goal}
          mode={contrib.mode}
          onClose={() => setContrib(null)}
        />
      )}
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md rounded-t-3xl bg-background p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom"
      >
        {children}
      </div>
    </div>
  );
}

function NewGoalSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Nama target wajib diisi");
    const num = Number(target.replace(/[^\d]/g, ""));
    if (!num || num <= 0) return toast.error("Nominal target tidak valid");
    setBusy(true);
    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      name: name.trim(),
      target_amount: num,
      saved_amount: 0,
      deadline: deadline || null,
      emoji,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Target dibuat 🎯");
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Target tabungan baru</h3>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`btn-press grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl text-2xl ${
                emoji === e ? "bg-primary/15 ring-2 ring-primary" : "bg-accent"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Misalnya: Liburan ke Bali"
          className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
        <input
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Target nominal (Rp)"
          className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="btn-press mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Buat target
      </button>
    </Sheet>
  );
}

function ContribSheet({ goal, mode, onClose }: { goal: Goal; mode: "add" | "sub"; onClose: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    const num = Number(amount.replace(/[^\d]/g, ""));
    if (!num || num <= 0) return toast.error("Nominal tidak valid");
    setBusy(true);
    const delta = mode === "add" ? num : -num;
    const newSaved = Math.max(0, Number(goal.saved_amount) + delta);
    const { error } = await supabase
      .from("savings_goals")
      .update({ saved_amount: newSaved, updated_at: new Date().toISOString() })
      .eq("id", goal.id)
      .eq("user_id", user.id);
    if (!error) {
      await supabase.from("savings_contributions").insert({
        user_id: user.id,
        goal_id: goal.id,
        amount: delta,
      });
      if (mode === "add" && newSaved >= Number(goal.target_amount)) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: `Target "${goal.name}" tercapai 🎉`,
          body: "Selamat! Kamu berhasil mencapai target tabungan ini ✨",
          kind: "success",
        });
        toast.success(`Target "${goal.name}" tercapai 🎉`);
      } else {
        toast.success(mode === "add" ? "Berhasil ditambahkan" : "Berhasil dikurangi");
      }
    } else toast.error(error.message);
    setBusy(false);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">
          {mode === "add" ? "Tambah ke" : "Kurangi dari"} {goal.name}
        </h3>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent">
          <X className="h-5 w-5" />
        </button>
      </div>
      <input
        autoFocus
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="Nominal (Rp)"
        className="w-full rounded-2xl border border-input bg-card px-4 py-4 text-lg font-semibold outline-none focus:border-ring"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
      </button>
    </Sheet>
  );
}

function NewGroupSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [emoji, setEmoji] = useState("🏝️");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Nama tabungan wajib diisi");
    const num = Number(target.replace(/[^\d]/g, ""));
    if (!num || num <= 0) return toast.error("Nominal target tidak valid");
    setBusy(true);
    const { data, error } = await supabase
      .from("group_savings")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        target_amount: num,
        deadline: deadline || null,
        emoji,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tabungan bareng dibuat 🎉 Sekarang ajak temanmu!");
    onClose();
    if (data?.id) window.location.assign(`/groups/${data.id}`);
  };

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Tabungan bareng baru</h3>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`btn-press grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl text-2xl ${
                emoji === e ? "bg-primary/15 ring-2 ring-primary" : "bg-accent"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Misalnya: Liburan ke Bali bareng"
          className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
        <input
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Target nominal (Rp)"
          className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
        />
        <p className="text-[11px] text-muted-foreground">🔒 Teman yang kamu ajak hanya bisa lihat dan setor ke tabungan ini — bukan keuangan pribadimu.</p>
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="btn-press mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Buat tabungan bareng
      </button>
    </Sheet>
  );
}
