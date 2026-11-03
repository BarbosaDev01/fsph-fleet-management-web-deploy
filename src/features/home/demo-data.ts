import type { Driver, Vehicle } from './types';

export const initialVehicles: Vehicle[] = [
  {
    id: 1,
    plate: 'ABC-1D23',
    model: 'Fiat Argo',
    category: 'Passeio',
    driver: 'João Silva',
    status: 'Ativo',
  },
  {
    id: 2,
    plate: 'DEF-4G56',
    model: 'Chevrolet Onix',
    category: 'Passeio',
    driver: 'Maria Santos',
    status: 'Ativo',
  },
  {
    id: 3,
    plate: 'GHI-7J89',
    model: 'Fiat Fiorino',
    category: 'Utilitário',
    driver: 'Carlos Lima',
    status: 'Manutenção',
  },
  {
    id: 4,
    plate: 'JKL-2M34',
    model: 'Renault Master',
    category: 'Van',
    driver: 'Não atribuído',
    status: 'Inativo',
  },
];

export const initialDrivers: Driver[] = [
  { id: 1, name: 'João Silva', license: '12345678901', sector: 'Operações', status: 'Disponível' },
  { id: 2, name: 'Maria Santos', license: '23456789012', sector: 'Logística', status: 'Em rota' },
  { id: 3, name: 'Carlos Lima', license: '34567890123', sector: 'Operações', status: 'Disponível' },
];
