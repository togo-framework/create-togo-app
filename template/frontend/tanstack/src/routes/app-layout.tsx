import { useEffect, useState } from "react";
import { Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { LayoutGrid, Table2, User, LogOut, Layers, ChevronDown } from "lucide-react";
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarInset, SidebarTrigger, Avatar, AvatarFallback,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  StatusBadge,
} from "@togo-framework/ui";
import { auth, type Me } from "../lib/auth";
import { metaResources } from "../lib/admin";
import { API, APP_NAME } from "../lib/api";

export function AppLayout() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [me, setMe] = useState<Me | null>(null);
  const [resources, setResources] = useState<{ name: string; table: string }[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    auth.me().then((u) => { if (!u) nav({ to: "/login" }); else setMe(u); });
    metaResources().then(setResources);
    const es = new EventSource(`${API}/events`);
    es.onopen = () => setLive(true); es.onerror = () => setLive(false);
    return () => es.close();
  }, [nav]);

  const initial = (me?.email ?? "?").charAt(0).toUpperCase();
  const go = (to: string) => nav({ to });

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Layers className="h-4 w-4" /></span>
            <span className="truncate font-semibold">{APP_NAME}</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton isActive={pathname === "/dashboard"} onClick={() => go("/dashboard")}><LayoutGrid className="h-4 w-4" /><span>Dashboard</span></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton isActive={pathname === "/admin"} onClick={() => go("/admin")}><Table2 className="h-4 w-4" /><span>Admin</span></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          {resources.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Resources</SidebarGroupLabel>
              <SidebarMenu>
                {resources.map((r) => (
                  <SidebarMenuItem key={r.table}><SidebarMenuButton isActive={pathname === `/admin/${r.table}`} onClick={() => go(`/admin/${r.table}`)}><Table2 className="h-4 w-4" /><span className="capitalize">{r.name || r.table}</span></SidebarMenuButton></SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive={pathname === "/profile"} onClick={() => go("/profile")}><User className="h-4 w-4" /><span>Profile</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <StatusBadge tone={live ? "success" : "neutral"}>{live ? "Realtime connected" : "Offline"}</StatusBadge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pe-3 ps-1 outline-none transition hover:bg-accent">
              <Avatar className="h-8 w-8"><AvatarFallback>{initial}</AvatarFallback></Avatar>
              <span className="max-w-[160px] truncate text-sm">{me?.email ?? "…"}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => go("/profile")}><User className="me-2 h-4 w-4" />Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={async () => { await auth.logout(); go("/login"); }}><LogOut className="me-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-w-0 flex-1"><Outlet /></main>
      </SidebarInset>
    </SidebarProvider>
  );
}
