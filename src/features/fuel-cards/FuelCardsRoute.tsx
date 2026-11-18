import { FuelCardsProvider } from './data/FuelCardsProvider';
import { FuelCardsLayout } from './components/FuelCardsLayout';

export function FuelCardsRoute() {
  return (
    <FuelCardsProvider>
      <FuelCardsLayout />
    </FuelCardsProvider>
  );
}
