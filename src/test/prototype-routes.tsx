// Isolated regression harness for preserved design references. These are not operational routes.
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { FleetLayout } from '@/shared/components/FleetLayout';
import { DriversPage } from '@/features/drivers/DriversPage';
import { DriverRegistrationPage } from '@/features/drivers/DriverRegistrationPage';
import { VehiclesPage } from '@/features/vehicles/VehiclesPage';
import { VehicleRegistrationPage } from '@/features/vehicles/VehicleRegistrationPage';
import { UsuariosPage } from '@/features/usuarios/UsuariosPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SolicitacoesPage } from '@/features/solicitacoes/SolicitacoesPage';
import { NovaSolicitacaoPage } from '@/features/nova-solicitacao/NovaSolicitacaoPage';
import { AtendimentoSvoPage } from '@/features/atendimento-svo/AtendimentoSvoPage';

export const prototypeRoutes: RouteObject[] = [
  {
    path: '/demonstracoes/frota',
    element: <FleetLayout />,
    children: [
      { index: true, element: <Navigate to="/demonstracoes/frota/motoristas" replace /> },
      { path: 'motoristas', element: <DriversPage /> },
      { path: 'motoristas/novo', element: <DriverRegistrationPage /> },
      { path: 'veiculos', element: <VehiclesPage /> },
      { path: 'veiculos/novo', element: <VehicleRegistrationPage /> },
    ],
  },
  { path: '/demonstracoes/cadastro-usuarios', element: <UsuariosPage /> },
  { path: '/demonstracoes/dashboard', element: <DashboardPage /> },
  { path: '/demonstracoes/solicitacoes', element: <SolicitacoesPage /> },
  { path: '/demonstracoes/solicitacoes/nova', element: <NovaSolicitacaoPage /> },
  { path: '/demonstracoes/atendimento-svo', element: <AtendimentoSvoPage /> },
];
