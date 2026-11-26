import { useAccess } from '@/features/auth/access';
import type { FuelingScope } from './fuelings.api';

/**
 * Regras do backend (V17 e FuelingController):
 * - FUELINGS_READ consulta todo o histórico; sem ela, FUELINGS_WRITE consulta só os próprios registros.
 * - Registrar exige FUELINGS_WRITE e FUEL_STATIONS_READ (lista de postos credenciados).
 * - Motoristas não listam a frota: usam os veículos atribuídos (VEHICLES_ASSIGNED_READ).
 */
export function useFuelingAccess() {
  const { can, user } = useAccess();
  const scope: FuelingScope = can('FUELINGS_READ') ? 'all' : 'mine';
  const vehicleScope =
    user?.role !== 'MOTORISTA' && can('VEHICLES_READ')
      ? ('fleet' as const)
      : can('VEHICLES_ASSIGNED_READ')
        ? ('assigned' as const)
        : null;
  const canRegister = can('FUELINGS_WRITE') && can('FUEL_STATIONS_READ') && vehicleScope !== null;
  return { scope, vehicleScope, canRegister };
}
