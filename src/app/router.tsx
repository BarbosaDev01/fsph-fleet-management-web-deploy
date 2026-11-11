import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/shared/components/NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/usuarios',
    lazy: async () => {
      const { UsuariosPage } = await import('@/features/usuarios/UsuariosPage');
      return { Component: UsuariosPage };
    },
  },
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/dashboard',
    lazy: async () => {
      const { DashboardPage } = await import('@/features/dashboard/DashboardPage');
      return { Component: DashboardPage };
    },
  },
  {
    path: '/atendimento-svo',
    lazy: async () => {
      const { AtendimentoSvoPage } = await import('@/features/atendimento-svo/AtendimentoSvoPage');
      return { Component: AtendimentoSvoPage };
    },
  },
  {
    path: '/solicitacoes',
    lazy: async () => {
      const { SolicitacoesPage } = await import('@/features/solicitacoes/SolicitacoesPage');
      return { Component: SolicitacoesPage };
    },
  },
  {
    path: '/solicitacoes/nova',
    lazy: async () => {
      const { NovaSolicitacaoPage } =
        await import('@/features/nova-solicitacao/NovaSolicitacaoPage');
      return { Component: NovaSolicitacaoPage };
    },
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
