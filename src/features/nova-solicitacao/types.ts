export type RouteChoice = 'new' | 'existing';
export type PassengerCount = 1 | 2 | 3 | 4;

export interface RequestFormValues {
  origin: string;
  destination: string;
  serviceType: string;
  demandSector: string;
  occurredAt: string;
  passengerCount: PassengerCount | '';
  observations: string;
  routeChoice: RouteChoice;
}

/** Frontend demo copy of the Mermaid TRANSPORTS shape, not an API contract. */
export type TransportStatus = 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
export interface DemoSector {
  id: string;
  name: string;
}
export interface DemoUser {
  id: string;
  sector_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'COORDENADOR' | 'MOTORISTA';
  is_active: boolean;
}
export interface DemoTransport {
  id: string;
  sector_id: string;
  requested_by_user_id: string;
  occurred_at: string;
  service_type: string;
  pickup_location: string;
  destination: string;
  status: TransportStatus;
}

/** UI-only values absent from TRANSPORTS, stored separately from the domain-shaped record. */
export interface RequestPresentationMetadata {
  passengerCount: PassengerCount;
  observations: string;
  routeChoice: RouteChoice;
}

export interface DemoSubmission {
  transport: DemoTransport;
  presentation: RequestPresentationMetadata;
}
