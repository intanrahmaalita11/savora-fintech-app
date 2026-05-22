import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtIDR } from "@/lib/format";
import { ArrowLeft, Plus, Loader2, UserPlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/groups/$id")({ component: GroupPage });

type Group = {
  id: string;
  owner_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
  emoji: string | null;
};

type Contribution = {
  id: string;
  user_id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

type Member = { user_id: string };
type Profile = { id: string; display_name: string | null; avatar_url: string | null };

function GroupPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [showContrib, setShowContrib] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(async () => {
    const [{ data: g }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("group_savings").select("*").eq("id", id).maybeSingle(),
      supabase.from("group_contributions").select("*").eq("group_id", id).order("created_at", { ascending: false }),
      supabase.from("group_members").select("user_id").eq("group_id", id),
    ]);
    setGroup(g as Group | null);
    setContribs((c ?? []) as Contribution[]);
    setMembers((m ?? []) as Member[]);
    const ids = new Set<string>();
    if (g) ids.add((g as Group).owner_id);
    for (const mm of (m ?? []) as Member[]) ids.add(mm.user_id);
    for (const cc of (c ?? []) as Contribution[]) ids.add(cc.user_id);
    if (ids.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", Array.from(ids));
      const map: Record<string, Profile> = {};
      for (const p of (profs ?? []) as Profile[]) map[p.id] = p;
      setProfiles(map);
    }
  }, [id]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`g-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_savings", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_contributions", filter: `group_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  if (!group) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const pct = Math.min(100, (Number(group.saved_amount) / Number(group.target_amount)) * 100);
  const done = pct >= 100;
  const isOwner = group.owner_id === user?.id;

  const memberTotals = new Map<string, number>();
  for (const c of contribs) memberTotals.set(c.user_id, (memberTotals.get(c.user_id) ?? 0) + Number(c.amount));

  const removeGroup = async () => {
    if (!confirm("Hapus tabungan bareng ini?")) return;
    await supabase.from("group_savings").delete().eq("id", group.id);
    nav({ to: "/savings" });
  };

  const leaveGroup = async () => {
    if (!user) return;
    if (!confirm("Keluar dari grup ini?")) return;
    await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", user.id);
    nav({ to: "/savings" });
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <button onClick={() => nav({ to: "/savings" })} className="no-tap rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-extrabold flex-1 truncate">{group.name}</h1>
        {isOwner ? (
          <button onClick={removeGroup} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={leaveGroup} className="text-xs text-muted-foreground hover:text-destructive">Keluar</button>
        )}
      </header>

      <div className="card-soft overflow-hidden p-0">
        <div className="bg-brand p-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-3xl backdrop-blur">
              {group.emoji ?? "🏝️"}
            </span>
            <div>
              <p className="text-xs opacity-90">Target bareng</p>
              <p className="font-numeric text-2xl font-extrabold">{fmtIDR(Number(group.target_amount))}</p>
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold">{Math.round(pct)}% tercapai</span>
            <span className="opacity-90">{fmtIDR(Number(group.saved_amount))}</span>
          </div>
        </div>
        <button
          onClick={() => setShowContrib(true)}
          className="btn-press flex w-full items-center justify-center gap-2 py-4 text-sm font-bold text-primary"
        >
          <Plus className="h-4 w-4" /> {done ? "Tambah lagi" : "Setor ke tabungan"}
        </button>
      </div>

      <div className="card-soft p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Anggota ({Math.max(members.length, 1)})</p>
          {isOwner && (
            <button
              onClick={() => setShowInvite(true)}
              className="btn-press flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
            >
              <UserPlus className="h-3.5 w-3.5" /> Ajak
            </button>
          )}
        </div>
        <ul className="mt-3 space-y-2">
          {[{ user_id: group.owner_id }, ...members.filter((m) => m.user_id !== group.owner_id)].map((m) => {
            const p = profiles[m.user_id];
            const contributed = memberTotals.get(m.user_id) ?? 0;
            return (
              <li key={m.user_id} className="flex items-center gap-3">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-xs font-bold text-primary-foreground">
                    {(p?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p?.display_name ?? "Anggota"} {m.user_id === group.owner_id && <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-primary">Owner</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Setor {fmtIDR(contributed)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card-soft p-5">
        <p className="text-sm font-semibold">Riwayat setoran</p>
        {contribs.length === 0 ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">Belum ada setoran</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {contribs.map((c) => {
              const p = profiles[c.user_id];
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p?.display_name ?? "Anggota"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-numeric text-sm font-bold ${Number(c.amount) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {Number(c.amount) >= 0 ? "+" : ""}{fmtIDR(Number(c.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showContrib && <ContribSheet group={group} onClose={() => setShowContrib(false)} />}
      {showInvite && isOwner && <InviteSheet group={group} existing={new Set(members.map((m) => m.user_id))} onClose={() => setShowInvite(false)} />}
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-md rounded-t-3xl bg-background p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom">
        {children}
      </div>
    </div>
  );
}

function ContribSheet({ group, onClose }: { group: Group; onClose: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    const num = Number(amount.replace(/[^\d]/g, ""));
    if (!num || num <= 0) return toast.error("Nominal tidak valid");
    setBusy(true);
    const { error } = await supabase.from("group_contributions").insert({
      group_id: group.id,
      user_id: user.id,
      amount: num,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Setoran tercatat 💚");
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Setor ke {group.name}</h3>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent"><X className="h-5 w-5" /></button>
      </div>
      <input
        autoFocus inputMode="numeric" value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="Nominal (Rp)"
        className="w-full rounded-2xl border border-input bg-card px-4 py-4 text-lg font-semibold outline-none focus:border-ring"
      />
      <input
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan (opsional)"
        className="mt-3 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
      />
      <button
        onClick={submit} disabled={busy}
        className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Setor sekarang
      </button>
    </Sheet>
  );
}

function InviteSheet({ group, existing, onClose }: { group: Group; existing: Set<string>; onClose: () => void }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<{ id: string; display_name: string | null; avatar_url: string | null }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: f } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const ids = (f ?? []).map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id));
      if (!ids.length) return;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", ids);
      setFriends((profs ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]);
    })();
  }, [user]);

  const invite = async (fid: string) => {
    setBusy(fid);
    const { error } = await supabase.from("group_members").insert({ group_id: group.id, user_id: fid });
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: fid,
        title: `Diajak nabung bareng 🎯`,
        body: `Kamu diajak ikut tabungan "${group.name}"`,
        kind: "info",
      });
      toast.success("Teman diajak");
    } else toast.error(error.message);
    setBusy(null);
  };

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Ajak teman</h3>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent"><X className="h-5 w-5" /></button>
      </div>
      {friends.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Belum ada teman. Tambahkan teman dulu di menu Teman.</p>
      ) : (
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {friends.map((f) => {
            const added = existing.has(f.id);
            return (
              <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-sm font-bold text-primary-foreground">
                    {(f.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="flex-1 truncate text-sm font-semibold">{f.display_name ?? "Teman"}</p>
                <button
                  disabled={added || busy === f.id}
                  onClick={() => invite(f.id)}
                  className="btn-press rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {added ? "Sudah" : busy === f.id ? "…" : "Ajak"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}