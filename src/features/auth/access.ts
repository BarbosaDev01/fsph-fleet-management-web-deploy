import type { Permission } from '@/shared/api/types';
import { useSession } from './useSession';

const modulePermissions: Record<string, readonly Permission[]> = {
  '/dashboard': ['VEHICLES_READ', 'DRIVERS_READ', 'TRIP_REQUESTS_READ'],
  '/setores': ['SECTORS_READ'],
  '/usuarios': ['USERS_READ', 'USERS_WRITE'],
  '/veiculos': ['VEHICLES_READ'],
  '/motoristas': ['DRIVERS_READ'],
  '/transportes': ['TRANSPORTS_READ', 'TRANSPORTS_MANAGE'],
  '/viagens': ['ROUTES_READ', 'ROUTES_MANAGE'],
  '/solicitacoes': ['TRIP_REQUESTS_READ', 'TRIP_REQUESTS_WRITE'],
  '/analise-viagens': ['TRIP_REQUESTS_READ'],
  '/coletas-svo': ['SVO_ORDERS_READ'],
  '/indicadores-svo': ['SVO_ORDERS_REPORT'],
  '/atendimento-svo': ['SVO_REQUESTS_READ', 'SVO_REQUESTS_WRITE'],
  '/cartoes-combustivel': ['FUEL_CARDS_READ'],
  '/permissoes': ['PERMISSIONS_READ'],
};

export function useAccess() {
  const { data } = useSession();
  const granted = data?.permissions ?? [];
  const can = (permission: Permission) => granted.includes(permission);
  const canAny = (required: readonly Permission[]) => required.some(can);
  const canVisit = (path: string) => {
    path = path.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
    if (path === '/solicitacoes/nova') return can('TRIP_REQUESTS_WRITE');
    if (path === '/usuarios/novo') return can('USERS_WRITE');
    if (path === '/motoristas/novo') return can('DRIVERS_READ') && can('DRIVERS_WRITE');
    if (path === '/veiculos/novo') return can('VEHICLES_READ') && can('VEHICLES_WRITE');
    if (path === '/cartoes-combustivel/novo' || /^\/cartoes-combustivel\/[^/]+\/editar$/.test(path))
      return can('FUEL_CARDS_READ') && can('FUEL_CARDS_WRITE');
    const required = modulePermissions[`/${path.split('/')[1]}`];
    return !required || canAny(required);
  };
  return { can, canAny, canVisit, user: data };
}
