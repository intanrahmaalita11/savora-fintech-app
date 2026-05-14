import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password minimal 6 karakter");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password berhasil diubah 🎉");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <Link to="/"><Logo /></Link>
      <div className="mt-10">
        <h1 className="font-display text-3xl font-extrabold">Buat password baru</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pilih password yang aman & mudah diingat.</p>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password baru"
          className="w-full rounded-2xl border border-input bg-card px-4 py-4 outline-none focus:border-ring"
        />
        <button
          disabled={busy}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan password
        </button>
      </form>
    </div>
  );
}
