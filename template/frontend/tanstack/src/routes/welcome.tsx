import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Layers, LayoutGrid, BookOpen, Boxes, FileText, Blocks, GitBranch, ArrowRight, ArrowLeft,
} from "lucide-react";
import { ProductMark, Status, buttonVariants } from "@fadymondy/nasaq/web";
import { API, APP_NAME } from "../lib/api";
import { sessionMe, type Me } from "../lib/auth";
import { useLang } from "../lib/i18n";

type Card = {
  icon: typeof Layers;
  en: string; ar: string;
  descEn: string; descAr: string;
  to?: string; href?: string;
};

// The resource grid — Laravel-welcome style: where a fresh togo app sends you next.
const CARDS: Card[] = [
  { icon: LayoutGrid, en: "Dashboard", ar: "لوحة التحكم", descEn: "Your app's admin panel — account, roles, resources.", descAr: "لوحة الإدارة — الحساب والأدوار والموارد.", to: "/dashboard" },
  { icon: BookOpen, en: "REST API", ar: "واجهة REST", descEn: "Typed OpenAPI 3.1 docs for every resource.", descAr: "توثيق OpenAPI 3.1 لكل مورد.", href: `${API}/docs` },
  { icon: Boxes, en: "GraphQL", ar: "GraphQL", descEn: "Explore the schema in the GraphQL playground.", descAr: "استكشف المخطط في GraphQL.", href: `${API}/graphql/play` },
  { icon: FileText, en: "Documentation", ar: "التوثيق", descEn: "Guides, generators and the togo CLI.", descAr: "أدلة ومولّدات وواجهة togo.", href: "https://to-go.dev/docs" },
  { icon: Blocks, en: "Plugins", ar: "الإضافات", descEn: "Add auth, cache, queue, storage in one command.", descAr: "أضف المصادقة والتخزين بأمر واحد.", href: "https://to-go.dev/plugins" },
  { icon: GitBranch, en: "GitHub", ar: "GitHub", descEn: "Source, issues and the framework repos.", descAr: "المصدر والمستودعات.", href: "https://github.com/togo-framework" },
];

export function Welcome() {
  const { ar, tx } = useLang();
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const [health, setHealth] = useState<{ status?: string; togo?: string } | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch(`${API}/api/health`).then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
    sessionMe().then(setMe).catch(() => setMe(null));
  }, []);

  const online = health?.status === "ok";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">

      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-20">
        {/* hero */}
        <header className="text-center">
          <ProductMark size={64} className="mx-auto mb-6" />
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">{APP_NAME}</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            {tx("Built with togo — your Go API and React UI, shipped as one binary.",
                "مبنيٌّ باستخدام togo — واجهة Go وتطبيق React في ثنائيّة واحدة.")}
          </p>

          {/* auth-aware CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {me ? (
              <Link to="/dashboard" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}>
                {tx("Go to dashboard", "اذهب إلى لوحة التحكم")} <Arrow />
              </Link>
            ) : (
              <>
                <Link to="/login" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}>
                  {tx("Log in", "تسجيل الدخول")}
                </Link>
                <Link to="/register" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full sm:w-auto" })}>
                  {tx("Create account", "إنشاء حساب")}
                </Link>
              </>
            )}
          </div>
        </header>

        {/* resource grid — Laravel-welcome style */}
        <div className="mt-14 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => {
            const inner = (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <span className="font-medium">{tx(c.en, c.ar)}</span>
                  <Arrow className="ms-auto h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tx(c.descEn, c.descAr)}</p>
              </>
            );
            const cls = "group block bg-card p-5 text-start transition-colors hover:bg-accent";
            return c.to ? (
              <Link key={c.en} to={c.to} className={cls}>{inner}</Link>
            ) : (
              <a key={c.en} href={c.href} target={c.href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={cls}>{inner}</a>
            );
          })}
        </div>

        {/* footer status */}
        <footer className="mt-14 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <Status tone={online ? "success" : "neutral"}>
            {tx(online ? "API connected" : "API offline", online ? "الواجهة متّصلة" : "الواجهة غير متّصلة")}
          </Status>
          <span aria-hidden>·</span>
          <span>togo {health?.togo ?? "…"}</span>
          <span aria-hidden>·</span>
          <span>{tx("powered by Go", "مدعوم بـ Go")}</span>
        </footer>
      </div>
    </main>
  );
}
