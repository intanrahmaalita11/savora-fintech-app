import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CheckCheck, Trash2, BellOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({ component: NotifPage });

type N = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  read: boolean;
  created_at: string;
};

function NotifPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setItems((data ?? []) as N[]);
    };
    load();
    const ch = supabase
      .channel("notif")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    toast.success("Semua ditandai dibaca");
  };

  const remove = async (id: string) => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id);
  };

  const tone = (k: string) =>
    k === "success"
      ? "bg-success/15 text-success"
      : k === "warning"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-accent text-accent-foreground";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Notifikasi</h1>
        <button
          onClick={markAll}
          className="btn-press inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Baca semua
        </button>
      </header>

      {items.length === 0 ? (
        <div className="card-soft flex flex-col items-center gap-3 p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent">
            <BellOff className="h-7 w-7 text-accent-foreground" />
          </div>
          <h3 className="text-base font-semibold">Belum ada notifikasi</h3>
          <p className="text-sm text-muted-foreground">
            Reminder budget, target tercapai & info lainnya akan muncul di sini.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`card-soft flex items-start gap-3 p-4 ${!n.read ? "ring-1 ring-primary/30" : ""}`}
            >
              <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl text-sm ${tone(n.kind)}`}>
                {n.kind === "success" ? "🎉" : n.kind === "warning" ? "⚠️" : "🔔"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <button
                onClick={() => remove(n.id)}
                className="no-tap rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
