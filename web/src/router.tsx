import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet, redirect } from "@tanstack/react-router";
import { SentraLoading } from "@togo-framework/ui";
import { Providers } from "./providers";
import { sessionMe } from "./lib/auth";
import { Home } from "./routes/home";
import { Entities } from "./routes/entities";
import { EntityProfile } from "./routes/entity-profile";
import { CapabilitySection } from "./routes/capability-section";
import { AgentSection } from "./routes/agent-section";
import { Narratives } from "./routes/narratives";
import { NarrativeDetail } from "./routes/narrative-detail";
import { Alerts } from "./routes/alerts";
import { Newsletter } from "./routes/newsletter";
import { Capabilities } from "./routes/capabilities";
import { Login } from "./routes/login";
import { Register } from "./routes/register";
import { Reset } from "./routes/reset";
import { AppLayout } from "./routes/app-layout";

// The authenticated admin surface (dashboard charts/widgets/ThemePicker, the
// resource tables/forms/infolists) is the heavy part of the bundle — lazy-load it
// so it splits into its own chunk and the public/auth first paint stays small.
// The router's pending component (SentraLoading) shows while the chunk loads.
const Dashboard = lazyRouteComponent(() => import("./routes/dashboard"), "Dashboard");
const AdminHome = lazyRouteComponent(() => import("./routes/admin"), "AdminHome");
const AdminResource = lazyRouteComponent(() => import("./routes/admin-resource"), "AdminResource");
const Profile = lazyRouteComponent(() => import("./routes/profile"), "Profile");
const AdminIntel = lazyRouteComponent(() => import("./routes/admin-intel"), "AdminIntel");
const AdminLeads = lazyRouteComponent(() => import("./routes/admin-leads"), "AdminLeads");
const AdminCapabilities = lazyRouteComponent(() => import("./routes/admin-capabilities"), "AdminCapabilities");

const rootRoute = createRootRoute({ component: () => (<Providers><Outlet /></Providers>) });

// Already signed in → skip the auth pages and go straight to the dashboard.
const redirectIfAuthed = async () => {
  if (await sessionMe()) throw redirect({ to: "/dashboard" });
};

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Home });
const entitiesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/entities", component: Entities });
const entityProfileRoute = createRoute({ getParentRoute: () => rootRoute, path: "/entities/$slug", component: EntityProfile });
const capabilityRoute = createRoute({ getParentRoute: () => rootRoute, path: "/modules/$slug", component: CapabilitySection });
const agentSectionRoute = createRoute({ getParentRoute: () => rootRoute, path: "/agents/$slug", component: AgentSection });
const narrativesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/narratives", component: Narratives });
const narrativeDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: "/narratives/$id", component: NarrativeDetail });
const alertsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/alerts", component: Alerts });
const newsletterRoute = createRoute({ getParentRoute: () => rootRoute, path: "/newsletter", component: Newsletter });
const capabilitiesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/capabilities", component: Capabilities });
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
const intelRoute = createRoute({ getParentRoute: () => appRoute, path: "/admin/intel", component: AdminIntel });
const leadsRoute = createRoute({ getParentRoute: () => appRoute, path: "/admin/leads", component: AdminLeads });
const adminCapsRoute = createRoute({ getParentRoute: () => appRoute, path: "/admin/capabilities", component: AdminCapabilities });

const routeTree = rootRoute.addChildren([
  indexRoute, entitiesRoute, entityProfileRoute, capabilityRoute, capabilitiesRoute, agentSectionRoute, narrativesRoute, narrativeDetailRoute, alertsRoute, newsletterRoute, loginRoute, registerRoute, resetRoute,
  appRoute.addChildren([dashboardRoute, adminRoute, intelRoute, leadsRoute, adminCapsRoute, resourceRoute, profileRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Branded full-screen loader while a route's beforeLoad (e.g. the auth check) runs.
  // 150ms delay so cached/instant navigations don't flash it.
  defaultPendingComponent: () => (
    <SentraLoading iconName="sparkles" productNameEn="Saudi Ventures" productNameAr="ريادة الأعمال السعودية" />
  ),
  defaultPendingMs: 150,
  defaultPendingMinMs: 300,
});

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
