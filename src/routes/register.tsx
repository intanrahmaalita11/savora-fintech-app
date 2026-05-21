import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";

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
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);

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

  const signUpGoogle = async () => {
    setGoogle(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res?.error) {
      setGoogle(false);
      toast.error(res.error.message || "Gagal daftar dengan Google");
    }
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
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-base pr-12"
              autoComplete="new-password"
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

        <button
          disabled={busy}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Daftar
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        atau
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={signUpGoogle}
        disabled={google}
        className="btn-press flex w-full items-center justify-center gap-3 rounded-2xl border border-input bg-card px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm disabled:opacity-60"
      >
        {google ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Daftar dengan Google
      </button>

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-2 1.5-4.5 2.4-7 2.4-5.3 0-9.7-3.5-11.3-8.3l-6.5 5C9.5 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5.1C40.9 35.7 43.5 30.3 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
