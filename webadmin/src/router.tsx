import * as React from 'react';
import { createRootRouteWithContext, createRoute, createRouter, Outlet, RouterProvider, redirect } from '@tanstack/react-router';
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

const rootRoute = createRootRouteWithContext<RouterCtx>()({ component: () => <Outlet /> });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminLayout,
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' });
  },
});

const dashboardRoute = createRoute({ getParentRoute: () => adminRoute, path: '/', component: Dashboard });
const reportsRoute   = createRoute({ getParentRoute: () => adminRoute, path: 'reports',  component: Reports });
const analyticsRoute = createRoute({ getParentRoute: () => adminRoute, path: 'analytics',component: Analytics });
const usersRoute     = createRoute({ getParentRoute: () => adminRoute, path: 'users',    component: Users });
const contentRoute   = createRoute({ getParentRoute: () => adminRoute, path: 'content',  component: Content });
const securityRoute  = createRoute({ getParentRoute: () => adminRoute, path: 'security', component: Security });

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRoute.addChildren([dashboardRoute, reportsRoute, analyticsRoute, usersRoute, contentRoute, securityRoute]),
]);

const router = createRouter({ routeTree, defaultPreload: 'intent', context: { user: null } });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}

export default function AppRouter({ user }: { user: User | null }) {
  return <RouterProvider router={router} context={{ user }} />;
}
