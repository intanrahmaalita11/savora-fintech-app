import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, ListChecks, PiggyBank, Bell, User, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const tabs = [
  { to: "/dashboard", icon: Home, label: "Beranda" },
  { to: "/transactions", icon: ListChecks, label: "Transaksi" },
  { to: "/savings", icon: PiggyBank, label: "Tabungan" },
  { to: "/notifications", icon: Bell, label: "Notif" },
  { to: "/profile", icon: User, label: "Profil" },
] as const;

export function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-32 pt-4">
        <Outlet />
      </main>

      {/* Floating action button */}
      <button
        onClick={() => navigate({ to: "/add" })}
        aria-label="Tambah transaksi"
        className="btn-press no-tap fixed bottom-24 left-1/2 z-30 -translate-x-1/2 grid h-14 w-14 place-items-center rounded-full text-primary-foreground shadow-xl"
        style={{ background: "linear-gradient(135deg, var(--sage), var(--sage-deep))" }}
      >
        <Plus className="h-7 w-7" />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md p-3">
        <div className="glass mx-auto flex items-center justify-around rounded-3xl px-2 py-2 shadow-lg">
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="no-tap relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium"
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-2xl transition-all ${
                    active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {t.to === "/notifications" && unread > 0 && (
                    <span className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
