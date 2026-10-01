import { useEffect, useState } from "react";
import {
  PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Infolist, LoadingState,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@fadymondy/nasaq/web";
import { sessionMe, type Me } from "../lib/auth";
import { useLang } from "../lib/i18n";

// Add a language here to offer it across the app (and to NasaqProvider's `locales`).
// The profile uses a dropdown so the list scales beyond two.
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

export function Profile() {
  const { locale, setLocale, tx } = useLang();
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { sessionMe().then(setMe); }, []);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={tx("Profile", "الملف الشخصي")} description={me?.email} />
      {!me ? <LoadingState /> : (
        <Card>
          <CardHeader>
            <CardTitle>{tx("Account", "الحساب")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Infolist
              items={[
                { id: "email", label: "Email", labelAr: "البريد الإلكتروني", type: "email", value: me.email, copyable: true },
                {
                  id: "roles", label: "Roles", labelAr: "الأدوار", value: me.roles ?? ["user"],
                  render: () => <div className="flex flex-wrap gap-1.5">{(me.roles ?? ["user"]).map((r) => <Badge key={r} variant="brand">{r}</Badge>)}</div>,
                },
                { id: "permissions", label: "Permissions", labelAr: "الصلاحيات", type: "list", value: me.permissions ?? [], wide: true },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Language preference — switching it updates the whole UI immediately (NasaqProvider). */}
      <Card>
        <CardHeader>
          <CardTitle>{tx("Language", "اللغة")}</CardTitle>
          <CardDescription>{tx("Change the interface language. Applies instantly.", "تغيير لغة الواجهة، يُطبّق فورًا.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select items={LANGUAGES} value={locale} onValueChange={(v) => { if (v) setLocale(String(v)); }}>
            <SelectTrigger className="w-64" aria-label={tx("Language", "اللغة")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
