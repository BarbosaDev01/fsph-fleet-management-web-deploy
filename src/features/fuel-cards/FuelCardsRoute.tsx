import { FuelCardsProvider } from './data/FuelCardsProvider';
import { FuelCardsLayout } from './components/FuelCardsLayout';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAccess } from '@/features/auth/access';
import { createApiRepository } from './data/api-repository';

export function FuelCardsRoute() {
  const { can } = useAccess();
  const demo = useLocation().pathname.startsWith('/demonstracoes/');
  const readVehicles = can('VEHICLES_READ');
  const repository = useMemo(() => createApiRepository(readVehicles), [readVehicles]);
  return (
    <FuelCardsProvider
      repository={demo ? undefined : repository}
      canWrite={demo || can('FUEL_CARDS_WRITE')}
    >
      <FuelCardsLayout />
    </FuelCardsProvider>
  );
}
