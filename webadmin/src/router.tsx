// src/router.tsx
import * as React from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  redirect,
} from "@tanstack/react-router";
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "@/firebase";
import {getFirestore, doc, getDoc} from "firebase/firestore";

import AdminLogin from "@/pages/AdminLogin";
import AdminLayout from "@/layouts/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import Users from "@/pages/Users";
import Content from "@/pages/Content";
import Security from "@/pages/Security";
import ReportDetail from "@/pages/ReportDetail";

/** Wait for Firebase Auth to settle and return the user (or null). */
function authReady(): Promise<import("firebase/auth").User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}

// Read current auth state + claims (supports admin claim + role claim + Firestore allow-list)
async function getAuthState() {
  const u = await authReady();
  if (!u) {
    return {
      authed: false as const,
      isAdmin: false,
      role: null as string | null,
      mustChange: false,
    };
  }

  try {
    // refresh so the newest custom claims are present
    const token = await u.getIdTokenResult(true);
    const claims = token.claims || {};
    const role = (claims.role as string | undefined) ?? null;
    const mustChange = Boolean(claims.mustChange);
    let isAdmin = claims.admin === true || role === "admin" || role === "superadmin";

    // Firestore fallback: /admins/<uid> {active:true}
    if (!isAdmin) {
      const db = getFirestore();
      const snap = await getDoc(doc(db, "admins", u.uid));
      if (snap.exists() && snap.data()?.active === true) {
        isAdmin = true;
      }
    }

    return {authed: true as const, isAdmin, role, mustChange};
  } catch {
    return {authed: false as const, isAdmin: false, role: null, mustChange: false};
  }
}

const rootRoute = createRootRoute({component: () => <Outlet />});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const {authed, isAdmin, mustChange} = await getAuthState();
    if (!authed) throw redirect({to: "/login", replace: true});
    if (isAdmin) {
      if (mustChange) throw redirect({to: "/admin/change-password", replace: true});
      throw redirect({to: "/admin", replace: true});
    }
    throw redirect({to: "/login", replace: true});
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: AdminLogin,
  beforeLoad: async () => {
    const {authed, isAdmin, mustChange} = await getAuthState();
    if (authed && isAdmin) {
      if (mustChange) throw redirect({to: "/admin/change-password", replace: true});
      throw redirect({to: "/admin", replace: true});
    }
  },
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminLayout,
  beforeLoad: async () => {
    const {authed, isAdmin, mustChange} = await getAuthState();
    if (!authed) throw redirect({to: "/login", replace: true});
    if (!isAdmin) throw redirect({to: "/login", replace: true});
    if (mustChange) throw redirect({to: "/admin/change-password", replace: true});
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: Dashboard,
});
const reportsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "reports",
  component: Reports,
});
const reportDetailRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "reports/$id",   // ✅ dynamic segment
  component: ReportDetail,
});
const analyticsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "analytics",
  component: Analytics,
});
const usersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "users",
  component: Users,
});
const contentRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "content",
  component: Content,
});
const securityRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "security",
  component: Security,
});

const changePasswordRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "change-password",
  beforeLoad: async () => {
    const {authed, isAdmin} = await getAuthState();
    if (!authed || !isAdmin) throw redirect({to: "/login", replace: true});
  },
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  beforeLoad: async () => {
    const {authed, isAdmin, mustChange} = await getAuthState();
    if (!authed) throw redirect({to: "/login", replace: true});
    if (isAdmin) {
      if (mustChange) throw redirect({to: "/admin/change-password", replace: true});
      throw redirect({to: "/admin", replace: true});
    }
    throw redirect({to: "/login", replace: true});
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminRoute.addChildren([
    dashboardRoute,
    reportsRoute,
    reportDetailRoute,
    analyticsRoute,
    usersRoute,
    contentRoute,
    securityRoute,
    changePasswordRoute,
  ]),
  notFoundRoute,
]);

const router = createRouter({routeTree, defaultPreload: "intent"});

// TS augmentation (optional)
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
