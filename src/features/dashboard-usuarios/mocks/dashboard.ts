import type { DashboardData } from '../dashboard.types';

// Historical fixture from the supplied HTML. No authenticated API requests or session changes.
export const demoDashboard: DashboardData = {
  updatedAt: '2026-10-06T14:20:00-03:00',
  period: '30/09–06/10/2026',
  fleet: { available: 5, inRoute: 3, maintenance: 1, unavailable: 1 },
  triage: { pending: 3, allocation: 2, requestsToday: 12 },
  dailyRequests: [
    { date: '30/09', count: 5 },
    { date: '01/10', count: 8 },
    { date: '02/10', count: 6 },
    { date: '03/10', count: 10 },
    { date: '04/10', count: 12 },
    { date: '05/10', count: 13 },
    { date: '06/10', count: 9 },
  ],
  routes: [
    {
      id: 'SVO-2026-0402',
      sector: 'SVO',
      origin: 'Rua das Flores 120',
      destination: 'Sede SVO',
      driver: 'Carlos Silva',
      vehicle: 'Van 02',
      startsAt: '2026-10-06T14:00:00-03:00',
      occupied: 1,
      capacity: 2,
    },
    {
      id: 'SVO-2026-0401',
      sector: 'SVO',
      origin: 'Hospital Municipal',
      destination: 'Sede SVO',
      driver: 'Marcos Oliveira',
      vehicle: 'Carro 04',
      startsAt: '2026-10-06T13:30:00-03:00',
      occupied: 1,
      capacity: 1,
    },
    {
      id: 'ADM-2026-0105',
      sector: 'Administrativo',
      origin: 'Sede FSPH',
      destination: 'Almoxarifado',
      driver: 'João Santos',
      vehicle: 'S10',
      startsAt: '2026-10-06T14:10:00-03:00',
      occupied: 3,
      capacity: 4,
    },
  ],
  refueling: [
    { id: 'fuel-1', vehicle: 'Van 02', detail: 'Diesel • 30 L • R$ 6/L', amount: 180 },
    {
      id: 'fuel-2',
      vehicle: 'S10',
      detail: 'Registro demonstrativo de abastecimento',
      amount: 380,
    },
    { id: 'fuel-3', vehicle: 'Carro 04', detail: 'Sem dados recentes', amount: null },
  ],
  alerts: [
    {
      id: 'alert-1',
      title: 'Carro 01 — Troca de suspensão',
      detail: 'Previsão: 07/10/2026',
      description:
        'Veículo em manutenção. A previsão é um dado histórico fictício e não representa a disponibilidade atual da frota.',
    },
    {
      id: 'alert-2',
      title: 'Van 01 — Documentos vencidos',
      detail: 'CRLV vencido em 30/09/2026',
      description:
        'Pendência documental demonstrativa. Regularização necessária antes de uma nova alocação.',
    },
    {
      id: 'alert-3',
      title: 'Pedro — CNH vencida',
      detail: 'Bloqueado para nova rota',
      description: 'Habilitação pendente de atualização no cenário demonstrativo.',
    },
  ],
};

export async function loadDemoDashboard(): Promise<DashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return structuredClone(demoDashboard);
}
