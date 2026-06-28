// Users admin — the out-of-the-box account-management page built on the
// @togo-framework/ui admin suite (UserManagementTable + UserActionsMenu +
// AddUserButton). Wired to the app's /api/admin/* surface (internal/admin).
import { useCallback, useEffect, useState } from "react";
import {
  PageHeader, Card, AddUserButton, UserManagementTable, UserActionsMenu, useT, toast,
  type AdminUser, type AddUserInput, type EditUserInput, type AdminLinkResult,
} from "@togo-framework/ui";
import { adminUsers, setImpersonating, AdminError } from "../lib/admin-users";

export function Users() {
  const { language } = useT();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await adminUsers.list());
      setAvailable(true);
    } catch (e) {
      if (e instanceof AdminError && (e.status === 404 || e.status === 501)) setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function onCreate(input: AddUserInput) {
    await adminUsers.create({ email: input.email, password: input.password, roles: input.roles });
    toast.success(language === "ar" ? "تم إنشاء المستخدم" : "User created");
    await reload();
  }

  async function onEdit(u: AdminUser, input: EditUserInput) {
    await adminUsers.update(String(u.id), { email: input.email, roles: input.roles, permissions: input.permissions });
    toast.success(language === "ar" ? "تم تحديث المستخدم" : "User updated");
    await reload();
  }

  async function onImpersonate(u: AdminUser) {
    await adminUsers.impersonate(String(u.id));
    setImpersonating(u.email ?? "");
    window.location.assign("/dashboard");
  }

  async function onReset(u: AdminUser, password?: string): Promise<AdminLinkResult | void> {
    const r = await adminUsers.resetPassword(String(u.id), password);
    if (password) { toast.success(language === "ar" ? "تم تعيين كلمة المرور" : "Password reset"); return; }
    return { link: r.link, emailed: r.emailed };
  }

  async function onMagic(u: AdminUser): Promise<AdminLinkResult> {
    const r = await adminUsers.magicLink(String(u.id));
    return { link: r.link, emailed: r.emailed };
  }

  async function onDelete(u: AdminUser) {
    await adminUsers.remove(String(u.id));
    toast.success(language === "ar" ? "تم حذف المستخدم" : "User deleted");
    await reload();
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={language === "ar" ? "المستخدمون" : "Users"}
        description={language === "ar" ? "حسابات يديرها مكوّن togo للمصادقة" : "Accounts managed by the togo auth plugin"}
        actions={<AddUserButton language={language} onSubmit={onCreate} />}
      />

      {!available && (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">
            {language === "ar"
              ? "واجهة الإدارة غير متاحة — ثبّت مكوّن المصادقة: togo install togo-framework/auth"
              : "The admin API is unavailable — install the auth backend with `togo install togo-framework/auth`."}
          </p>
        </Card>
      )}

      <UserManagementTable
        users={users}
        loading={loading}
        language={language}
        renderActions={(u) => (
          <UserActionsMenu
            user={u}
            language={language}
            onEdit={(input) => onEdit(u, input)}
            onImpersonate={() => onImpersonate(u)}
            onResetPassword={({ password }) => onReset(u, password)}
            onSendMagicLink={() => onMagic(u)}
            onDelete={() => onDelete(u)}
          />
        )}
      />
    </div>
  );
}
