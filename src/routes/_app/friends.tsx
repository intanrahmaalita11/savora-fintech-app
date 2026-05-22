import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { ArrowLeft, UserPlus, Check, X, Loader2, Mail, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/friends")({ component: FriendsPage });

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

type MiniProfile = { id: string; display_name: string | null; avatar_url: string | null };

function FriendsPage() {
  const { user } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [rows, setRows] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({});
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Friendship[];
    setRows(list);
    const ids = Array.from(
      new Set(list.flatMap((r) => [r.requester_id, r.addressee_id])).values(),
    ).filter((id) => id !== user.id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", ids);
      const map: Record<string, MiniProfile> = {};
      for (const p of (profs ?? []) as MiniProfile[]) map[p.id] = p;
      setProfiles(map);
    }
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("fr-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  const sendRequest = async () => {
    if (!user) return;
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) return toast.error("Masukkan email yang valid");
    setBusy(true);
    const { data: found, error } = await supabase.rpc("find_user_by_email", { _email: e });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const target = (found as MiniProfile[] | null)?.[0];
    if (!target) {
      setBusy(false);
      return toast.error("Email belum terdaftar di Savora");
    }
    if (target.id === user.id) {
      setBusy(false);
      return toast.error("Itu emailmu sendiri 😅");
    }
    const { error: insErr } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: target.id,
      status: "pending",
    });
    setBusy(false);
    if (insErr) {
      if (insErr.code === "23505") return toast.error("Sudah pernah mengirim permintaan ke teman ini");
      return toast.error(insErr.message);
    }
    await supabase.from("notifications").insert({
      user_id: target.id,
      title: "Permintaan teman baru ✨",
      body: `${user.email} ingin berteman di Savora`,
      kind: "info",
    });
    setEmail("");
    toast.success("Permintaan terkirim 🚀");
    load();
  };

  const respond = async (f: Friendship, accept: boolean) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success(accept ? "Pertemanan diterima 🎉" : "Permintaan ditolak");
    if (accept) {
      await supabase.from("notifications").insert({
        user_id: f.requester_id,
        title: "Permintaan diterima 🎉",
        body: "Sekarang kalian bisa nabung bersama di Savora",
        kind: "success",
      });
    }
  };

  const removeFriend = async (id: string) => {
    if (!confirm("Hapus pertemanan ini?")) return;
    await supabase.from("friendships").delete().eq("id", id);
    toast.success("Pertemanan dihapus");
  };

  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === user?.id);
  const outgoing = rows.filter((r) => r.status === "pending" && r.requester_id === user?.id);
  const accepted = rows.filter((r) => r.status === "accepted");

  const otherId = (f: Friendship) => (f.requester_id === user?.id ? f.addressee_id : f.requester_id);

  const renderAvatar = (p?: MiniProfile, name?: string) => {
    if (p?.avatar_url) {
      return <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-2xl object-cover" />;
    }
    return (
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-sm font-bold text-primary-foreground">
        {(p?.display_name ?? name ?? "?").slice(0, 1).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <button onClick={() => nav({ to: "/profile" })} className="no-tap rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold">{t("friends.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("friends.privacy")}</p>
        </div>
      </header>

      <div className="card-soft p-5">
        <p className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> {t("friends.add")}
        </p>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("friends.add.placeholder")}
              className="w-full rounded-2xl border border-input bg-card pl-9 pr-3 py-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <button
            onClick={sendRequest}
            disabled={busy}
            className="btn-press grid place-items-center rounded-2xl bg-brand px-4 text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {incoming.length > 0 && (
        <Section title={t("friends.requests")}>
          {incoming.map((f) => {
            const p = profiles[otherId(f)];
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                {renderAvatar(p)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p?.display_name ?? "Teman baru"}</p>
                  <p className="text-[11px] text-muted-foreground">Menunggu konfirmasi</p>
                </div>
                <button
                  onClick={() => respond(f, true)}
                  className="btn-press grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => respond(f, false)}
                  className="btn-press grid h-9 w-9 place-items-center rounded-full bg-destructive/15 text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </Section>
      )}

      {outgoing.length > 0 && (
        <Section title={t("friends.outgoing")}>
          {outgoing.map((f) => {
            const p = profiles[otherId(f)];
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                {renderAvatar(p)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p?.display_name ?? "Menunggu…"}</p>
                  <p className="text-[11px] text-muted-foreground">Belum dikonfirmasi</p>
                </div>
                <button
                  onClick={() => removeFriend(f.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Batal
                </button>
              </li>
            );
          })}
        </Section>
      )}

      <Section title={t("friends.list")} icon={<Users className="h-4 w-4 text-primary" />}>
        {accepted.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">{t("friends.empty")}</li>
        ) : (
          accepted.map((f) => {
            const p = profiles[otherId(f)];
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                {renderAvatar(p)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p?.display_name ?? "Teman"}</p>
                  <p className="text-[11px] text-muted-foreground">Berteman sejak {new Date(f.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => removeFriend(f.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Hapus
                </button>
              </li>
            );
          })
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card-soft p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </p>
      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}