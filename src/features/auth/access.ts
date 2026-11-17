import type { Permission } from '@/shared/api/types';
import { useSession } from './useSession';

const modulePermissions: Record<string, readonly Permission[]> = {
  '/setores': ['SECTORS_READ'],
  '/usuarios': ['USERS_READ'],
  '/veiculos': ['VEHICLES_READ'],
  '/motoristas': ['DRIVERS_READ'],
  '/transportes': ['TRANSPORTS_READ', 'TRANSPORTS_MANAGE'],
  '/viagens': ['ROUTES_READ', 'ROUTES_MANAGE'],
  '/solicitacoes': ['TRIP_REQUESTS_READ', 'TRIP_REQUESTS_WRITE'],
  '/atendimento-svo': ['TRIP_REQUESTS_READ'],
  '/permissoes': ['PERMISSIONS_READ'],
};

export function useAccess() {
  const { data } = useSession();
  const granted = data?.permissions ?? [];
  const can = (permission: Permission) => granted.includes(permission);
  const canAny = (required: readonly Permission[]) => required.some(can);
  const canVisit = (path: string) => {
    if (path === '/solicitacoes/nova') return can('TRIP_REQUESTS_WRITE');
    if (path === '/usuarios/novo') return can('USERS_READ') && can('USERS_WRITE');
    if (path === '/motoristas/novo') return can('DRIVERS_READ') && can('DRIVERS_WRITE');
    if (path === '/veiculos/novo') return can('VEHICLES_READ') && can('VEHICLES_WRITE');
    const required = modulePermissions[`/${path.split('/')[1]}`];
    return !required || canAny(required);
  };
  return { can, canAny, canVisit, user: data };
}
