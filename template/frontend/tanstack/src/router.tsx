import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { Providers } from "./providers";
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

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Welcome });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: Login });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/register", component: Register });
const resetRoute = createRoute({ getParentRoute: () => rootRoute, path: "/reset", component: Reset });

const appRoute = createRoute({ getParentRoute: () => rootRoute, id: "_app", component: AppLayout });
const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: "/dashboard", component: Dashboard });
const adminRoute = createRoute({ getParentRoute: () => appRoute, path: "/admin", component: AdminHome });
const resourceRoute = createRoute({ getParentRoute: () => appRoute, path: "/admin/$resource", component: AdminResource });
const profileRoute = createRoute({ getParentRoute: () => appRoute, path: "/profile", component: Profile });

const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, registerRoute, resetRoute,
  appRoute.addChildren([dashboardRoute, adminRoute, resourceRoute, profileRoute]),
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
