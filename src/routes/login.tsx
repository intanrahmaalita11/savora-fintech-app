import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

function LoginPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/dashboard" });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email atau password salah" : error.message);
      return;
    }
    toast.success("Welcome back ✨");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <Link to="/"><Logo /></Link>
      <div className="mt-10">
        <h1 className="font-display text-3xl font-extrabold">Selamat datang kembali 👋</h1>
        <p className="mt-2 text-sm text-muted-foreground">Masuk untuk lanjutin financial journey kamu.</p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            className="input-base"
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-base pr-12"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="toggle password"
            >
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-primary">
            Lupa password?
          </Link>
        </div>

        <button
          disabled={busy}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Masuk
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link to="/register" className="font-semibold text-primary">
          Daftar
        </Link>
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
