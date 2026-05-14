import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPage });

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Masukkan email kamu");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Link reset password dikirim ke email ✉️");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <Link to="/"><Logo /></Link>
      <div className="mt-10">
        <h1 className="font-display text-3xl font-extrabold">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Kami kirim link reset ke emailmu.</p>
      </div>
      {sent ? (
        <div className="card-soft mt-8 p-5 text-sm text-foreground/80">
          Email reset sudah dikirim ke <b>{email}</b>. Cek inbox / spam ya ✨
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            className="w-full rounded-2xl border border-input bg-card px-4 py-4 outline-none focus:border-ring"
          />
          <button
            disabled={busy}
            className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim link
          </button>
        </form>
      )}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary">Kembali ke masuk</Link>
      </p>
    </div>
  );
}
