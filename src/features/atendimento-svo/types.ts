/** Domain-shaped transport data from the Mermaid model. Kept separate from SVO demo state. */
export type TransportStatus = 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
export type RouteStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RouteStopStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface TransportRecord {
  id: string;
  sector_id: string;
  requested_by_user_id: string;
  occurred_at: string;
  service_type: string;
  pickup_location: string;
  destination: string;
  status: TransportStatus;
}

export interface RouteRecord {
  id: string;
  vehicle_id: string;
  driver_id: string;
  created_by_user_id: string;
  status: RouteStatus;
  planned_start_at: string;
  real_start_at?: string;
  real_end_at?: string;
  start_mileage?: number;
  end_mileage?: number;
}

export interface RouteStopRecord {
  id: string;
  route_id: string;
  transport_id: string;
  stop_sequence: number;
  status: RouteStopStatus;
}

/** UI-only prototype state. These fields are not represented as backend contracts. */
export type SvoDemoStatus =
  | 'Em análise'
  | 'Aguardando complemento'
  | 'Aguardando análise'
  | 'Aprovada'
  | 'Negada'
  | 'Em execução';

export interface SvoHistoryEvent {
  id: string;
  time: string;
  action: string;
}

export interface SvoDemoRequest {
  id: string;
  transportId: string;
  protocol: string;
  status: SvoDemoStatus;
  enteredAt: string;
  wait: string;
  sector: 'SVO' | 'Administrativo';
  notes: string;
  contact: string;
  analysis: string;
  analysisSavedAt?: string;
  complementRequests: string[];
  denialReason?: string;
  history: SvoHistoryEvent[];
}

export interface DutyTeam {
  name: string;
  driver: string;
  vehicle: string;
  capacity: string;
  occupancy: string;
  state: 'Em rota' | 'Disponível';
  full?: boolean;
}
