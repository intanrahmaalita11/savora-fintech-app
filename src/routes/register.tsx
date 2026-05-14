import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(60),
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});

function RegisterPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: window.location.origin + "/dashboard",
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Akun dibuat! Cek email untuk verifikasi 💌");
    nav({ to: "/login" });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <Link to="/"><Logo /></Link>
      <div className="mt-10">
        <h1 className="font-display text-3xl font-extrabold">Buat akun Savora ✨</h1>
        <p className="mt-2 text-sm text-muted-foreground">Mulai perjalananmu spend better, save smarter.</p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Nama">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" className="input-base" />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" className="input-base" autoComplete="email" />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-base" autoComplete="new-password" />
        </Field>

        <button
          disabled={busy}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Daftar
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link to="/login" className="font-semibold text-primary">Masuk</Link>
      </p>

      <style>{`.input-base{width:100%;border-radius:1rem;border:1px solid var(--input);background:var(--card);padding:0.95rem 1rem;font-size:0.95rem;outline:none;transition:border-color .15s, box-shadow .15s}.input-base:focus{border-color:var(--ring);box-shadow:0 0 0 4px color-mix(in oklab, var(--ring) 18%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
