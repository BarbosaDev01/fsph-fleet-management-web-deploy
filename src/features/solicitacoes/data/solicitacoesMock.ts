export type RequestSector = 'SVO' | 'Administrativo';

export interface SolicitationRow {
  protocol: string;
  sector: RequestSector;
  origin: string;
  destination: string;
  driver: string;
  vehicle: string;
  vehicleCode?: string;
  time: string;
  status: 'Em execução' | 'Aprovado' | 'Em triagem' | 'Complemento';
  occupancy: string;
}

export const solicitations: SolicitationRow[] = [
  {
    protocol: 'SVO-2026-0402',
    sector: 'SVO',
    origin: 'Rua das Flores 120',
    destination: 'Sede SVO',
    driver: 'Carlos Silva',
    vehicle: 'Van 02',
    vehicleCode: 'SVO-0002',
    time: '14:00',
    status: 'Em execução',
    occupancy: '1/2',
  },
  {
    protocol: 'SVO-2026-0401',
    sector: 'SVO',
    origin: 'Hospital Municipal',
    destination: 'Sede SVO',
    driver: 'Marcos Oliveira',
    vehicle: 'Carro 04',
    time: '13:30',
    status: 'Em execução',
    occupancy: '1/1 Lotado',
  },
  {
    protocol: 'ADM-2026-0105',
    sector: 'Administrativo',
    origin: 'Sede FSPH',
    destination: 'Almoxarifado',
    driver: 'João Santos',
    vehicle: 'S10',
    time: '14:10',
    status: 'Em execução',
    occupancy: '3/4',
  },
  {
    protocol: 'ADM-2026-0106',
    sector: 'Administrativo',
    origin: 'Sede FSPH',
    destination: 'Biblioteca',
    driver: '—',
    vehicle: '—',
    time: '—',
    status: 'Aprovado',
    occupancy: '—',
  },
  {
    protocol: 'SVO-2026-0403',
    sector: 'SVO',
    origin: 'UPA Central',
    destination: 'Sede SVO',
    driver: '—',
    vehicle: '—',
    time: '—',
    status: 'Aprovado',
    occupancy: '—',
  },
  {
    protocol: 'SVO-2026-0404',
    sector: 'SVO',
    origin: 'Hospital São José',
    destination: 'Sede SVO',
    driver: '—',
    vehicle: '—',
    time: '—',
    status: 'Em triagem',
    occupancy: '—',
  },
  {
    protocol: 'SVO-2026-0405',
    sector: 'SVO',
    origin: 'Domiciliar',
    destination: 'Cemitério da Paz',
    driver: '—',
    vehicle: '—',
    time: '—',
    status: 'Complemento',
    occupancy: '—',
  },
  {
    protocol: 'SVO-2026-0406',
    sector: 'SVO',
    origin: 'Av. Brasil 450',
    destination: 'Sede SVO',
    driver: '—',
    vehicle: '—',
    time: '—',
    status: 'Em triagem',
    occupancy: '—',
  },
];
