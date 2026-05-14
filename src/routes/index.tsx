import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ArrowRight, Sparkles, PiggyBank, BellRing } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <header className="flex items-center justify-between">
        <Logo />
        <Link
          to="/login"
          className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-accent"
        >
          Masuk
        </Link>
      </header>

      <section className="mt-12 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Modern fintech aesthetic
        </div>
        <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
          Spend Better,
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg,var(--sage),var(--sage-deep))" }}
          >
            Save Smarter ✨
          </span>
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
          Atur pemasukan, pengeluaran, dan target tabunganmu dalam satu tempat yang clean,
          premium, dan smooth.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3">
        <Feature icon={<PiggyBank className="h-5 w-5" />} title="Smart Saving" desc="Target & progress realtime" />
        <Feature icon={<BellRing className="h-5 w-5" />} title="Money Reminder" desc="Notif limit & tagihan" />
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-12">
        <Link
          to="/register"
          className="btn-press group flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg"
        >
          Mulai gratis
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/login"
          className="btn-press text-center rounded-2xl border border-border bg-card/60 px-6 py-4 text-base font-semibold text-foreground"
        >
          Saya sudah punya akun
        </Link>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-soft p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
