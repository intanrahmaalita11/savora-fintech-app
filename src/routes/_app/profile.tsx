import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Camera, LogOut, Settings, Loader2, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profil diperbarui ✨");
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    await refreshProfile();
    setUploading(false);
    toast.success("Foto profil diperbarui");
  };

  const logout = async () => {
    await signOut();
    toast.success("Sampai jumpa 👋");
    nav({ to: "/" });
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Profil</h1>
        <Link to="/settings" className="rounded-full p-2 hover:bg-accent">
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <div className="card-soft flex flex-col items-center gap-4 p-6">
        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="h-24 w-24 rounded-3xl object-cover shadow" />
          ) : (
            <div
              className="grid h-24 w-24 place-items-center rounded-3xl text-3xl font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
            >
              {(profile?.display_name ?? "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-press absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-brand text-primary-foreground shadow-lg"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileRef} onChange={onPickFile} type="file" accept="image/*" className="hidden" />
        </div>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="card-soft p-5 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Nama tampilan</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-ring"
          />
        </label>
        <button
          onClick={save}
          disabled={busy}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan profil
        </button>
      </div>

      <Link
        to="/friends"
        className="card-soft flex items-center gap-3 p-4 no-tap"
      >
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-primary-foreground">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("profile.friends")}</p>
          <p className="text-[11px] text-muted-foreground">Atur teman & nabung bareng</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      <button
        onClick={logout}
        className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Keluar
      </button>
    </div>
  );
}
