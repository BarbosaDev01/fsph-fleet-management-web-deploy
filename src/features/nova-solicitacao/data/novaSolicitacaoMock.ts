import type {
  DemoSector,
  DemoSubmission,
  DemoTransport,
  DemoUser,
  PassengerCount,
  RequestFormValues,
} from '../types';

const sectorIds = {
  Administrativo: 'd0000000-0000-4000-8000-000000000001',
  SVO: 'd0000000-0000-4000-8000-000000000002',
} as const;

/** Frontend-only fixtures shaped after Mermaid entities; not backend contracts. */
export const sectors: DemoSector[] = [
  { id: sectorIds.Administrativo, name: 'Administrativo' },
  { id: sectorIds.SVO, name: 'SVO' },
];

export const users: DemoUser[] = [
  {
    id: 'a0000000-0000-4000-8000-000000000003',
    sector_id: sectorIds.Administrativo,
    name: 'Ana Coordenadora',
    email: 'ana.coordenadora@exemplo.test',
    password_hash: 'demo-hash-nao-utilizavel',
    role: 'COORDENADOR',
    is_active: true,
  },
];

export const initialFormValues: RequestFormValues = {
  origin: 'Sede FSPH',
  destination: 'Almoxarifado',
  serviceType: 'Coleta',
  demandSector: 'Administrativo',
  occurredAt: '2026-10-07T09:00',
  passengerCount: 3,
  observations: 'Coleta Sede FSPH → Almoxarifado.',
  routeChoice: 'existing',
};

export const passengerCountOptions: PassengerCount[] = [1, 2, 3, 4];
export const serviceTypeOptions = ['Coleta', 'Transporte de passageiros'] as const;
export const sectorOptions = ['Administrativo', 'SVO'] as const;

export function toDemoTransport(values: RequestFormValues, id: string): DemoTransport {
  return {
    id,
    sector_id: values.demandSector === 'SVO' ? sectorIds.SVO : sectorIds.Administrativo,
    requested_by_user_id: users[0]!.id,
    occurred_at: new Date(values.occurredAt).toISOString(),
    service_type: values.serviceType,
    pickup_location: values.origin.trim(),
    destination: values.destination.trim(),
    status: 'PENDING',
  };
}

export function toDemoSubmission(values: RequestFormValues, id: string): DemoSubmission {
  return {
    transport: toDemoTransport(values, id),
    presentation: {
      passengerCount: values.passengerCount as PassengerCount,
      observations: values.observations.trim(),
      routeChoice: values.routeChoice,
    },
  };
}
