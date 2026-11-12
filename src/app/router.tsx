import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { HomePage } from '@/features/home/HomePage';
import { AppLayout } from '@/app/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFoundPage } from '@/shared/components/NotFoundPage';
import { Loading } from '@/shared/components/ApiFeedback';
import { StagingDemoLayout } from '@/features/staging/StagingDemoLayout';

export const routes: RouteObject[] = [
  {
    path: '/demonstracoes',
    hydrateFallbackElement: <Loading />,
    element: <AppLayout showNavigation={false} />,
    children: [
      {
        element: <StagingDemoLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/staging/StagingDemoPage')).StagingDemoPage,
            }),
          },
          {
            path: 'frota',
            lazy: async () => ({
              Component: (await import('@/shared/components/FleetLayout')).FleetLayout,
            }),
            children: [
              { index: true, element: <Navigate to="/demonstracoes/frota/motoristas" replace /> },
              {
                path: 'motoristas',
                lazy: async () => ({
                  Component: (await import('@/features/drivers/DriversPage')).DriversPage,
                }),
              },
              {
                path: 'motoristas/novo',
                lazy: async () => ({
                  Component: (await import('@/features/drivers/DriverRegistrationPage'))
                    .DriverRegistrationPage,
                }),
              },
              {
                path: 'veiculos',
                lazy: async () => ({
                  Component: (await import('@/features/vehicles/VehiclesPage')).VehiclesPage,
                }),
              },
              {
                path: 'veiculos/novo',
                lazy: async () => ({
                  Component: (await import('@/features/vehicles/VehicleRegistrationPage'))
                    .VehicleRegistrationPage,
                }),
              },
            ],
          },
          {
            path: 'dashboard',
            lazy: async () => ({
              Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage,
            }),
          },
          {
            path: 'atendimento-svo',
            lazy: async () => ({
              Component: (await import('@/features/atendimento-svo/AtendimentoSvoPage'))
                .AtendimentoSvoPage,
            }),
          },
          {
            path: 'solicitacoes',
            lazy: async () => ({
              Component: (await import('@/features/solicitacoes/SolicitacoesPage'))
                .SolicitacoesPage,
            }),
          },
          {
            path: 'solicitacoes/nova',
            lazy: async () => ({
              Component: (await import('@/features/nova-solicitacao/NovaSolicitacaoPage'))
                .NovaSolicitacaoPage,
            }),
          },
          {
            path: 'cadastro-usuarios',
            lazy: async () => ({
              Component: (await import('@/features/usuarios/UsuariosPage')).UsuariosPage,
            }),
          },
          {
            path: 'dashboard-usuarios',
            lazy: async () => {
              const { DashboardPage } = await import('@/features/dashboard-usuarios/DashboardPage');
              return { Component: () => <DashboardPage demo /> };
            },
          },
          {
            path: 'diretorio',
            lazy: async () => ({
              Component: (await import('@/features/users/UsersPage')).UsersPage,
            }),
          },
          {
            path: 'login',
            lazy: async () => ({
              Component: (await import('@/features/login/LoginPage')).LoginPage,
            }),
          },
          {
            path: 'cadastro',
            lazy: async () => ({
              Component: (await import('@/features/registration/RegistrationPage'))
                .RegistrationPage,
            }),
          },
          {
            path: 'recuperar-senha',
            lazy: async () => ({
              Component: (await import('@/features/password-recovery/PasswordRecoveryPage'))
                .PasswordRecoveryPage,
            }),
          },
          {
            path: 'alterar-senha',
            lazy: async () => ({
              Component: (await import('@/features/password-reset/PasswordResetPage'))
                .PasswordResetPage,
            }),
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    hydrateFallbackElement: <Loading />,
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'conta',
        lazy: async () => ({
          Component: (await import('@/features/auth/AccountPage')).AccountPage,
        }),
      },
      {
        path: 'setores',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryPages')).SectorsPage,
        }),
      },
      {
        path: 'usuarios',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryPages')).UsersPage,
        }),
      },
      {
        path: 'veiculos',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryPages')).VehiclesPage,
        }),
      },
      {
        path: 'veiculos/:id/documentos',
        lazy: async () => ({
          Component: (await import('@/features/registry/DocumentsPage')).VehicleDocumentsPage,
        }),
      },
      {
        path: 'motoristas',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryPages')).DriversPage,
        }),
      },
      {
        path: 'motoristas/:id/cnhs',
        lazy: async () => ({
          Component: (await import('@/features/registry/DocumentsPage')).DriverLicensesPage,
        }),
      },
      {
        path: 'transportes',
        lazy: async () => ({
          Component: (await import('@/features/travel/TransportsPage')).TransportsPage,
        }),
      },
      {
        path: 'transportes/:id',
        lazy: async () => ({
          Component: (await import('@/features/travel/TransportsPage')).TransportDetailPage,
        }),
      },
      {
        path: 'viagens',
        lazy: async () => ({
          Component: (await import('@/features/travel/RoutesPage')).RoutesPage,
        }),
      },
      {
        path: 'viagens/:id',
        lazy: async () => ({
          Component: (await import('@/features/travel/RouteDetailPage')).RouteDetailPage,
        }),
      },
      {
        path: 'permissoes',
        lazy: async () => ({
          Component: (await import('@/features/permissions/PermissionsPage')).PermissionsPage,
        }),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
