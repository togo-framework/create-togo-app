import { useEffect, useState } from "react";
import { ProfileView, useT } from "@togo-framework/ui";
import { Languages } from "lucide-react";
import { sessionMe, type Me } from "../lib/auth";

export function Profile() {
  const { language, setLanguage } = useT();
  const ar = language === "ar";
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { sessionMe().then(setMe); }, []);
  if (!me) return <div className="p-8 text-muted-foreground">{ar ? "جارٍ التحميل…" : "Loading…"}</div>;

  return (
    <div dir={ar ? "rtl" : "ltr"}>
      <ProfileView user={{ email: me.email, roles: me.roles }} language={language} twoFactorEnabled={false} sessions={[]} />

      {/* Language preference — switching it updates the whole UI immediately (LanguageProvider). */}
      <div className="mx-auto max-w-5xl px-6 pb-10">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Languages className="h-4 w-4" />{ar ? "اللغة" : "Language"}</div>
          <p className="mb-4 text-sm text-muted-foreground">{ar ? "تغيير لغة الواجهة — يُطبّق فورًا." : "Change the interface language — applies instantly."}</p>
          <div className="inline-flex rounded-lg border border-border p-1">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${language === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {l === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
