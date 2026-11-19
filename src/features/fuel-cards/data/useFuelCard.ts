import { useQuery } from '@tanstack/react-query';
import { useFuelCardsData } from './FuelCardsProvider';
import { errorMessage } from '@/shared/api/result';

export function useFuelCard(id?: string) {
  const data = useFuelCardsData();
  const repository = data?.repository;
  const detail = useQuery({
    queryKey: ['fuel-card-detail', id, data?.revision],
    queryFn: () => repository!.findCard!(id!),
    enabled: Boolean(id && repository?.findCard),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  if (!repository?.findCard)
    return {
      loading: false,
      card:
        data?.state.status === 'ready'
          ? data.state.cards.find((item) => item.id === id)
          : undefined,
    };
  return {
    card: detail.data,
    loading: detail.isPending,
    error: detail.error ? errorMessage(detail.error) : undefined,
  };
}
