import { z } from 'zod';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/result';

// Conferido com FuelingController, CreateFuelingRequest, FuelingResponse e
// PrimeFuelStationController do backend (branch integracao-staging-backend-20261125).
// Esses endpoints ainda não constam em openapi/gestao-frotas.json; por isso as
// respostas são validadas em tempo de execução até o contrato ser regenerado.

export const fuelTypes = {
  GASOLINE: 'Gasolina',
  ETHANOL: 'Etanol',
  DIESEL: 'Diesel',
  DIESEL_S10: 'Diesel S10',
  CNG: 'GNV',
} as const;
export type FuelType = keyof typeof fuelTypes;
const fuelTypeSchema = z.enum(Object.keys(fuelTypes) as [FuelType, ...FuelType[]]);

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const decimal = z.coerce.number();

export const fuelingSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  vehiclePlate: z.string(),
  vehicleModel: z.string(),
  stationId: z.string(),
  stationName: z.string(),
  stationCnpj: z.string().nullish(),
  registeredByUserId: z.string().nullish(),
  registeredByName: z.string().nullish(),
  fueledOn: date,
  odometerKm: z.number(),
  previousOdometerKm: z.number().nullish(),
  distanceDrivenKm: z.number().nullish(),
  liters: decimal,
  totalValue: decimal,
  pricePerLiter: decimal,
  fuelType: fuelTypeSchema,
  consumptionKmPerLiter: decimal.nullish(),
  referenceAverageKmPerLiter: decimal.nullish(),
  outOfPattern: z.boolean(),
  anomalyReason: z.string().nullish(),
  createdAt: z.string().nullish(),
});
export type Fueling = z.infer<typeof fuelingSchema>;

const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  cnpj: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  active: z.boolean(),
});
export type FuelStation = z.infer<typeof stationSchema>;

const vehicleSchema = z.object({
  id: z.string(),
  plate: z.string(),
  model: z.string(),
  currentOdometerKm: z.number().nullish(),
  active: z.boolean(),
});
export type FuelingVehicle = z.infer<typeof vehicleSchema>;
export type FuelingScope = 'all' | 'mine';
export const fuelingKeys = {
  list: (scope: FuelingScope) => ['fuelings', scope] as const,
  stations: ['fuelings', 'stations'] as const,
  vehicles: (scope: 'fleet' | 'assigned') => ['fuelings', 'vehicles', scope] as const,
};

/** Corpo de POST /api/v1/fuelings (CreateFuelingRequest). */
export interface CreateFuelingBody {
  vehicleId: string;
  stationId: string;
  fueledOn: string;
  odometerKm: number;
  liters: number;
  totalValue: number;
  fuelType: FuelType;
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await apiRequest(path, init);
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, body);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new Error('A resposta do servidor não corresponde ao formato esperado.');
  return parsed.data;
}

export const fuelingsApi = {
  /**
   * Histórico completo (FUELINGS_READ) ou apenas os registros do usuário (FUELINGS_WRITE).
   * A API devolve a lista inteira, sem paginação; os filtros são aplicados na interface.
   */
  list(scope: FuelingScope) {
    return request(
      scope === 'all' ? '/api/v1/fuelings' : '/api/v1/fuelings/mine',
      z.array(fuelingSchema),
    );
  },
  create(body: CreateFuelingBody) {
    return request('/api/v1/fuelings', fuelingSchema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  stations() {
    return request('/api/v1/fuel-stations?activeOnly=true', z.array(stationSchema));
  },
  /** Gestores consultam a frota; motoristas só os veículos atribuídos a eles. */
  vehicles(scope: 'fleet' | 'assigned') {
    return request(
      scope === 'fleet' ? '/api/v1/vehicles' : '/api/v1/vehicles/me',
      z.array(vehicleSchema),
    );
  },
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const format = {
  money: (value: number) => brl.format(value),
  liters: (value: number) => `${number(3).format(value)} L`,
  km: (value: number) => `${number(0).format(value)} km`,
  kmPerLiter: (value: number) => `${number(2).format(value)} km/L`,
};
