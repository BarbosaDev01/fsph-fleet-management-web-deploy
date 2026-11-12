export interface ActiveRoute {
  id: string;
  sector: string;
  origin: string;
  destination: string;
  driver: string;
  vehicle: string;
  startsAt: string;
  occupied: number;
  capacity: number;
}

export interface DashboardData {
  updatedAt: string;
  period: string;
  fleet: { available: number; inRoute: number; maintenance: number; unavailable: number };
  triage: { pending: number; allocation: number; requestsToday: number };
  dailyRequests: { date: string; count: number }[];
  routes: ActiveRoute[];
  refueling: { id: string; vehicle: string; detail: string; amount: number | null }[];
  alerts: { id: string; title: string; detail: string; description: string }[];
}
