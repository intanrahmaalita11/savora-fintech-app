import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, ListChecks, PiggyBank, Bell, User, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

const tabsBase = [
  { to: "/dashboard", icon: Home, key: "nav.home" },
  { to: "/transactions", icon: ListChecks, key: "nav.tx" },
  { to: "/savings", icon: PiggyBank, key: "nav.savings" },
  { to: "/notifications", icon: Bell, key: "nav.notif" },
  { to: "/profile", icon: User, key: "nav.profile" },
] as const;

export function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useT();
  const [unread, setUnread] = useState(0);
  const [pendingFr, setPendingFr] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  // Incoming friend requests: badge + realtime toast + browser notification
  useEffect(() => {
    if (!user) return;
    const loadFr = async () => {
      const { count } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending");
      setPendingFr(count ?? 0);
    };
    loadFr();

    const acceptFr = async (id: string) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Pertemanan diterima 🎉");
    };

    const ch = supabase
      .channel("fr-incoming")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friendships", filter: `addressee_id=eq.${user.id}` },
        async (payload) => {
          loadFr();
          const row = payload.new as { id: string; requester_id: string; status: string };
          if (row.status !== "pending") return;
          const { data: p } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.requester_id)
            .maybeSingle();
          const name = p?.display_name ?? "Seseorang";
          toast(`${name} ingin berteman ✨`, {
            description: "Terima permintaan pertemanan di Savora",
            action: { label: "Terima", onClick: () => acceptFr(row.id) },
            duration: 10000,
          });
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Permintaan teman baru ✨", { body: `${name} ingin berteman di Savora` });
            } catch {}
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friendships", filter: `addressee_id=eq.${user.id}` },
        loadFr,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "friendships", filter: `addressee_id=eq.${user.id}` },
        loadFr,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-32 pt-4">
        <Outlet />
      </main>

      {/* Floating action button */}
      <button
        onClick={() => navigate({ to: "/add" })}
        aria-label="Tambah transaksi"
        className="btn-press no-tap fixed bottom-24 left-1/2 z-30 -translate-x-1/2 grid h-14 w-14 place-items-center rounded-full text-primary-foreground shadow-xl ring-glow"
        style={{ background: "var(--gradient-brand)" }}
      >
        <Plus className="h-7 w-7" />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md p-3">
        <div className="glass mx-auto flex items-center justify-around rounded-3xl px-2 py-2 shadow-lg">
          {tabsBase.map((tab) => {
            const active = loc.pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="no-tap relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium"
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-2xl transition-all ${
                    active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.to === "/notifications" && unread > 0 && (
                    <span className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                  {tab.to === "/profile" && pendingFr > 0 && (
                    <span className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                      {pendingFr > 9 ? "9+" : pendingFr}
                    </span>
                  )}
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {t(tab.key as Parameters<typeof t>[0])}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
