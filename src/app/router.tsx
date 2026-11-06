import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from '@/features/home/HomePage';
import { AppLayout } from '@/app/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { AccountPage } from '@/features/auth/AccountPage';
import {
  SectorsPage,
  UsersPage,
  VehiclesPage,
  DriversPage,
} from '@/features/registry/RegistryPages';
import { VehicleDocumentsPage, DriverLicensesPage } from '@/features/registry/DocumentsPage';
import { TransportsPage, TransportDetailPage } from '@/features/travel/TransportsPage';
import { RoutesPage } from '@/features/travel/RoutesPage';
import { RouteDetailPage } from '@/features/travel/RouteDetailPage';
import { PermissionsPage } from '@/features/permissions/PermissionsPage';
import { NotFoundPage } from '@/shared/components/NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'conta', element: <AccountPage /> },
      { path: 'setores', element: <SectorsPage /> },
      { path: 'usuarios', element: <UsersPage /> },
      { path: 'veiculos', element: <VehiclesPage /> },
      { path: 'veiculos/:id/documentos', element: <VehicleDocumentsPage /> },
      { path: 'motoristas', element: <DriversPage /> },
      { path: 'motoristas/:id/cnhs', element: <DriverLicensesPage /> },
      { path: 'transportes', element: <TransportsPage /> },
      { path: 'transportes/:id', element: <TransportDetailPage /> },
      { path: 'viagens', element: <RoutesPage /> },
      { path: 'viagens/:id', element: <RouteDetailPage /> },
      { path: 'permissoes', element: <PermissionsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
