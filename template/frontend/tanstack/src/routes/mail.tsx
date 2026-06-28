// Mail settings — SMTP setup so reset / magic-link emails actually send.
// The form UI comes from the @togo-framework/ui kit (MailSettingsForm); this
// page just supplies the data + API callbacks, wired to /api/admin/mail.
import { useEffect, useState } from "react";
import { PageHeader, MailSettingsForm, useT, type MailConfig } from "@togo-framework/ui";
import { adminMail, AdminError } from "../lib/admin-users";

export function Mail() {
  const { language } = useT();
  const [cfg, setCfg] = useState<MailConfig>({ port: 587, secure: true });
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adminMail.get()
      .then((d) => setCfg({ port: 587, secure: true, ...(d ?? {}) }))
      .catch((e) => { if (e instanceof AdminError && (e.status === 404 || e.status === 501)) setAvailable(false); })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={language === "ar" ? "إعدادات البريد" : "Mail settings"}
        description={language === "ar" ? "إعداد SMTP لإرسال رسائل إعادة التعيين والدخول السحري" : "Configure SMTP so reset & magic-link emails are delivered"}
      />
      {/* key flips once loaded so the kit form re-seeds from `value`. */}
      <MailSettingsForm
        key={loaded ? "loaded" : "init"}
        value={cfg}
        available={available}
        language={language}
        onSave={(c) => adminMail.save(c)}
        onTest={(to) => adminMail.test(to)}
      />
    </div>
  );
}
