import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Savora — Spend Better, Save Smarter" },
      {
        name: "description",
        content:
          "Savora adalah finance tracker & money reminder modern untuk membantumu mengatur pemasukan, pengeluaran, dan tabungan dengan smart.",
      },
      { name: "author", content: "Savora" },
      { name: "theme-color", content: "#7c9f7a" },
      { property: "og:title", content: "Savora — Spend Better, Save Smarter" },
      {
        property: "og:description",
        content: "Aesthetic finance tracker untuk Gen Z, mahasiswa & pekerja.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Savora — Spend Better, Save Smarter" },
      { name: "description", content: "Aplikasi pengelola keuangan harian dengan tampilan aesthetic nude yang membantu kamu mencatat pemasukan, pengeluaran, target tabungan, dan mengatur budget denga" },
      { property: "og:description", content: "Aplikasi pengelola keuangan harian dengan tampilan aesthetic nude yang membantu kamu mencatat pemasukan, pengeluaran, target tabungan, dan mengatur budget denga" },
      { name: "twitter:description", content: "Aplikasi pengelola keuangan harian dengan tampilan aesthetic nude yang membantu kamu mencatat pemasukan, pengeluaran, target tabungan, dan mengatur budget denga" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/SkCqXfaDHhcW73ukhIPlfQeGvou1/social-images/social-1778740568568-3d_rendering_qr_code_scanning_via_mobile_phone_with_bill_coin_floating_on_purple_background_pay_money_or_online_payment_shopping_special_concept_digital_transfer_financial_wallet_transaction___Premium_Photo.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/SkCqXfaDHhcW73ukhIPlfQeGvou1/social-images/social-1778740568568-3d_rendering_qr_code_scanning_via_mobile_phone_with_bill_coin_floating_on_purple_background_pay_money_or_online_payment_shopping_special_concept_digital_transfer_financial_wallet_transaction___Premium_Photo.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
