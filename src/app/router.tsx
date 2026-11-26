import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';
import { AppLayout } from '@/app/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFoundPage } from '@/shared/components/NotFoundPage';
import { Loading } from '@/shared/components/ApiFeedback';
import { StagingDemoLayout } from '@/features/staging/StagingDemoLayout';

const incorporated = [
  ['frota', '/motoristas'],
  ['frota/motoristas', '/motoristas'],
  ['frota/motoristas/novo', '/motoristas/novo'],
  ['frota/veiculos', '/veiculos'],
  ['frota/veiculos/novo', '/veiculos/novo'],
  ['dashboard', '/dashboard'],
  ['dashboard-usuarios', '/dashboard'],
  ['solicitacoes', '/solicitacoes'],
  ['solicitacoes/nova', '/solicitacoes/nova'],
  ['cadastro-usuarios', '/usuarios/novo'],
  ['diretorio', '/usuarios'],
  ['cadastro', '/usuarios/novo'],
  ['login', '/conta'],
  ['alterar-senha', '/conta'],
] as const;

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    hydrateFallbackElement: <Loading />,
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'relatorios',
        lazy: async () => ({
          Component: (await import('@/features/reports/ReportsRoute')).ReportsRoute,
        }),
      },
      {
        path: 'conta',
        lazy: async () => ({
          Component: (await import('@/features/auth/AccountPage')).AccountPage,
        }),
      },
      {
        path: 'dashboard',
        lazy: async () => ({
          Component: (await import('@/features/overview/OverviewPage')).OverviewPage,
        }),
      },
      {
        path: 'solicitacoes',
        lazy: async () => ({
          Component: (await import('@/features/requests/RequestsPage')).RequestsPage,
        }),
      },
      {
        path: 'solicitacoes/nova',
        lazy: async () => ({
          Component: (await import('@/features/requests/RequestsPage')).RequestsPage,
        }),
      },
      {
        path: 'solicitacoes/:id',
        lazy: async () => ({
          Component: (await import('@/features/requests/RequestDetailPage')).RequestDetailPage,
        }),
      },
      {
        path: 'analise-viagens',
        lazy: async () => {
          const { RequestsPage } = await import('@/features/requests/RequestsPage');
          return { Component: () => <RequestsPage management /> };
        },
      },
      {
        path: 'coletas-svo',
        lazy: async () => ({
          Component: (await import('@/features/svo-orders/SvoOrdersPage')).SvoOrdersPage,
        }),
      },
      {
        path: 'coletas-svo/:id',
        lazy: async () => ({
          Component: (await import('@/features/svo-orders/SvoOrderDetailPage')).SvoOrderDetailPage,
        }),
      },
      {
        path: 'indicadores-svo',
        lazy: async () => ({
          Component: (await import('@/features/svo-orders/SvoOrderReportPage')).SvoOrderReportPage,
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
        path: 'cartoes-combustivel',
        lazy: async () => ({
          Component: (await import('@/features/fuel-cards/FuelCardsRoute')).FuelCardsRoute,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/fuel-cards/FuelCardsPage')).FuelCardsPage,
            }),
          },
          {
            path: 'novo',
            lazy: async () => ({
              Component: (await import('@/features/fuel-cards/FuelCardCreatePage'))
                .FuelCardCreatePage,
            }),
          },
          {
            path: ':id/editar',
            lazy: async () => ({
              Component: (await import('@/features/fuel-cards/FuelCardEditPage')).FuelCardEditPage,
            }),
          },
          {
            path: ':id',
            lazy: async () => ({
              Component: (await import('@/features/fuel-cards/FuelCardDetailsPage'))
                .FuelCardDetailsPage,
            }),
          },
        ],
      },
      {
        path: 'abastecimentos',
        lazy: async () => ({
          Component: (await import('@/features/fuelings/FuelingsPage')).FuelingsPage,
        }),
      },
      {
        path: 'abastecimentos/novo',
        lazy: async () => ({
          Component: (await import('@/features/fuelings/FuelingCreatePage')).FuelingCreatePage,
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
        path: 'usuarios/novo',
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
        path: 'veiculos/novo',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryPages')).VehiclesPage,
        }),
      },
      {
        path: 'veiculos/:id',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryDetailPages')).VehicleDetailPage,
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
        path: 'motoristas/novo',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryPages')).DriversPage,
        }),
      },
      {
        path: 'motoristas/:id',
        lazy: async () => ({
          Component: (await import('@/features/registry/RegistryDetailPages')).DriverDetailPage,
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
      {
        path: 'demonstracoes',
        element: <StagingDemoLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/staging/StagingDemoPage')).StagingDemoPage,
            }),
          },
          ...incorporated.map(([path, to]) => ({ path, element: <Navigate to={to} replace /> })),
          {
            path: 'atendimento-svo',
            lazy: async () => ({
              Component: (await import('@/features/atendimento-svo/AtendimentoSvoDemoPage'))
                .AtendimentoSvoDemoPage,
            }),
          },
          {
            path: 'recuperar-senha',
            lazy: async () => ({
              Component: (await import('@/features/staging/UnavailableRecoveryPage'))
                .UnavailableRecoveryPage,
            }),
          },
          {
            path: 'cartoes-combustivel',
            lazy: async () => ({
              Component: (await import('@/features/fuel-cards/FuelCardsRoute')).FuelCardsRoute,
            }),
            children: [
              {
                path: 'inicio',
                element: <Navigate to="/demonstracoes/cartoes-combustivel" replace />,
              },
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/fuel-cards/FuelCardsPage')).FuelCardsPage,
                }),
              },
              {
                path: 'novo',
                lazy: async () => ({
                  Component: (await import('@/features/fuel-cards/FuelCardCreatePage'))
                    .FuelCardCreatePage,
                }),
              },
              {
                path: ':id/editar',
                lazy: async () => ({
                  Component: (await import('@/features/fuel-cards/FuelCardEditPage'))
                    .FuelCardEditPage,
                }),
              },
              {
                path: ':id',
                lazy: async () => ({
                  Component: (await import('@/features/fuel-cards/FuelCardDetailsPage'))
                    .FuelCardDetailsPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
export const router = createBrowserRouter(routes);
