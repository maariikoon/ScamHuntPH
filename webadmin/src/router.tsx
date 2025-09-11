import * as React from 'react';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  redirect,
} from '@tanstack/react-router';
import type { User } from 'firebase/auth';
import Login from '@/pages/Login';
import AdminLayout from '@/layouts/AdminLayout';
import Dashboard from '@/pages/Dashboard';
import Reports from '@/pages/Reports';
import Analytics from '@/pages/Analytics';
import Users from '@/pages/Users';
import Content from '@/pages/Content';
import Security from '@/pages/Security';

type RouterCtx = { user: User | null };

const rootRoute = createRootRouteWithContext<RouterCtx>()({
  component: () => <Outlet />,
});

/** Redirect "/" → /admin if admin, else /login */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ context }) => {
    const u = context.user;
    if (u) {
      const token = await u.getIdTokenResult(true);
      if (token.claims?.role === 'admin') {
        throw redirect({ to: '/admin' });
      }
    }
    throw redirect({ to: '/login' });
  },
});

// If already admin, skip /login
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: async ({ context }) => {
    const u = context.user;
    if (!u) return;
    const token = await u.getIdTokenResult(true);
    if (token.claims?.role === 'admin') throw redirect({ to: '/admin' });
  },
});

// /admin requires role: admin
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminLayout,
  beforeLoad: async ({ context }) => {
    const u = context.user;
    if (!u) throw redirect({ to: '/login' });
    const token = await u.getIdTokenResult(true);
    if (token.claims?.role !== 'admin') throw redirect({ to: '/login' });
  },
});

// children under /admin
const dashboardRoute = createRoute({ getParentRoute: () => adminRoute, path: '/',       component: Dashboard });
const reportsRoute   = createRoute({ getParentRoute: () => adminRoute, path: 'reports',  component: Reports });
const analyticsRoute = createRoute({ getParentRoute: () => adminRoute, path: 'analytics',component: Analytics });
const usersRoute     = createRoute({ getParentRoute: () => adminRoute, path: 'users',    component: Users });
const contentRoute   = createRoute({ getParentRoute: () => adminRoute, path: 'content',  component: Content });
const securityRoute  = createRoute({ getParentRoute: () => adminRoute, path: 'security', component: Security });

// (optional) catch-all → /login
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  beforeLoad: () => { throw redirect({ to: '/login' }); },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminRoute.addChildren([
    dashboardRoute,
    reportsRoute,
    analyticsRoute,
    usersRoute,
    contentRoute,
    securityRoute,
  ]),
  notFoundRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: { user: null },
});

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}

export default function AppRouter({ user }: { user: User | null }) {
  return <RouterProvider router={router} context={{ user }} />;
}
