import { useLocation } from 'react-router-dom';
export function useFuelCardsPath() {
  return useLocation().pathname.startsWith('/demonstracoes/')
    ? '/demonstracoes/cartoes-combustivel'
    : '/cartoes-combustivel';
}
