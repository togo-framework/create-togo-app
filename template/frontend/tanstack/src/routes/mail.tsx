// Mail settings — SMTP setup so reset & magic-link emails actually send.
// The form is Nasaq's SmtpSettings; this page supplies the data + API callbacks,
// wired to /api/admin/mail (lib/admin-users maps between the two shapes).
import { useEffect, useState } from "react";
import { PageHeader, SmtpSettings, ErrorState, type SmtpConfig } from "@fadymondy/nasaq/web";
import { adminMail, AdminError } from "../lib/admin-users";
import { sessionMe } from "../lib/auth";
import { useLang } from "../lib/i18n";

const EMPTY: SmtpConfig = { host: "", port: 587, encryption: "starttls", username: "", fromName: "", fromAddress: "", passwordSet: false };

export function Mail() {
  const { tx } = useLang();
  const [cfg, setCfg] = useState<SmtpConfig>(EMPTY);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    sessionMe().then((me) => setTestTo(me?.email ?? ""));
    adminMail.get()
      .then(setCfg)
      .catch((e) => { if (e instanceof AdminError && (e.status === 404 || e.status === 501)) setAvailable(false); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tx("Mail settings", "إعدادات البريد")}
        description={tx("Configure SMTP so reset & magic-link emails are delivered", "إعداد SMTP لإرسال رسائل إعادة التعيين والدخول السحري")}
      />
      {available ? (
        <SmtpSettings
          value={cfg}
          loading={loading}
          defaultTestTo={testTo}
          onSave={async (input) => {
            try { await adminMail.save(input); setCfg(await adminMail.get()); }
            catch (e) { return { error: e instanceof Error ? e.message : tx("Save failed", "تعذّر الحفظ") }; }
          }}
          onTest={(input) => adminMail.test(input)}
        />
      ) : (
        <ErrorState
          title={tx("Mail API unavailable", "واجهة البريد غير متاحة")}
          description={tx("Install the auth backend with `togo install togo-framework/auth`.", "ثبّت مكوّن المصادقة: togo install togo-framework/auth")}
        />
      )}
    </div>
  );
}
