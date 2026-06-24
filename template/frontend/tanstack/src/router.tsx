import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { SentraLoading } from "@togo-framework/ui";
import { Providers } from "./providers";
import { sessionMe } from "./lib/auth";
import { Welcome } from "./routes/welcome";
import { Login } from "./routes/login";
import { Register } from "./routes/register";
import { Reset } from "./routes/reset";
import { AppLayout } from "./routes/app-layout";
import { Dashboard } from "./routes/dashboard";
import { AdminHome } from "./routes/admin";
import { AdminResource } from "./routes/admin-resource";
import { Profile } from "./routes/profile";

const rootRoute = createRootRoute({ component: () => (<Providers><Outlet /></Providers>) });

// Already signed in → skip the auth pages and go straight to the dashboard.
const redirectIfAuthed = async () => {
  if (await sessionMe()) throw redirect({ to: "/dashboard" });
};

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Welcome });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: Login, beforeLoad: redirectIfAuthed });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/register", component: Register, beforeLoad: redirectIfAuthed });
const resetRoute = createRoute({ getParentRoute: () => rootRoute, path: "/reset", component: Reset });

// Protected shell. The guard runs in beforeLoad — BEFORE the layout/children render —
// so unauthenticated visitors are redirected to /login without the private page ever
// painting (the router shows the pending loader while the check runs). The resolved
// user is returned as route context so children don't re-fetch /me.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_app",
  component: AppLayout,
  beforeLoad: async () => {
    const me = await sessionMe();
    if (!me) throw redirect({ to: "/login" });
    return { me };
  },
});
const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: "/dashboard", component: Dashboard });
const adminRoute = createRoute({ getParentRoute: () => appRoute, path: "/admin", component: AdminHome });
const resourceRoute = createRoute({ getParentRoute: () => appRoute, path: "/admin/$resource", component: AdminResource });
const profileRoute = createRoute({ getParentRoute: () => appRoute, path: "/profile", component: Profile });

const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, registerRoute, resetRoute,
  appRoute.addChildren([dashboardRoute, adminRoute, resourceRoute, profileRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Branded full-screen loader while a route's beforeLoad (e.g. the auth check) runs.
  // 150ms delay so cached/instant navigations don't flash it.
  defaultPendingComponent: () => <SentraLoading />,
  defaultPendingMs: 150,
  defaultPendingMinMs: 300,
});

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
