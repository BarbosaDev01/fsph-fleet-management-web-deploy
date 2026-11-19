import { z } from 'zod';
import { apiClient } from '@/shared/api/client';
import { result } from '@/shared/api/result';
import type { Dto } from '@/shared/api/types';
import { vehiclesApi } from '@/features/registry/api';
import type { FuelCard } from '../fuel-card.types';
import type { FuelCardsRepository, FuelCardFormValues } from './fuel-cards-repository';

export const cardStatuses = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado',
  CANCELED: 'Cancelado',
} as const;
type Status = keyof typeof cardStatuses;
const statusCode = (label: string) =>
  (Object.keys(cardStatuses) as Status[]).find((key) => cardStatuses[key] === label);
const money = z
  .string()
  .regex(
    /^\d{1,10}([.,]\d{1,2})?$/,
    'Informe um valor positivo ou zero, com até duas casas decimais.',
  );
const date = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    'Informe uma data válida.',
  );
export const apiFormSchema = z.object({
  number: z.string().trim().min(4, 'Informe de 4 a 50 caracteres.').max(50),
  cardholderName: z.string().trim().min(1, 'Informe o titular ou identificador.').max(120),
  limit: money,
  availableBalance: money.or(z.literal('')).optional(),
  validity: date,
  notes: z.string().max(500).optional(),
});
const decimal = (value: string) => Number(value.replace(',', '.'));
export function presentCard(card: Dto['FuelCardResponse']): FuelCard {
  return {
    id: card.id,
    card: card.cardNumber,
    cardholderName: card.cardholderName,
    totalLimit: card.totalLimit,
    availableBalance: card.availableBalance,
    validity: card.expirationDate.split('-').reverse().join('/'),
    expirationDate: card.expirationDate,
    status: cardStatuses[card.status],
    vehicle: card.vehicle ? `${card.vehicle.plate} · ${card.vehicle.model}` : undefined,
    vehicleId: card.vehicle?.id,
    notes: card.notes,
  };
}
const body = (values: FuelCardFormValues) => ({
  cardholderName: values.cardholderName!.trim(),
  expirationDate: values.validity,
  totalLimit: decimal(values.limit),
  notes: values.notes?.trim() || undefined,
});
export function createApiRepository(readVehicles = true): FuelCardsRepository {
  return {
    mode: 'api',
    formSchema: apiFormSchema,
    editSchema: apiFormSchema.extend({ number: z.string(), availableBalance: money }),
    async load(query = {}) {
      const [page, vehicles] = await Promise.all([
        result(
          apiClient.GET('/api/v1/fuel-cards', {
            params: {
              query: {
                page: query.page ?? 0,
                size: 20,
                search: query.search || undefined,
                status: query.status ? statusCode(query.status) : undefined,
                vehicleId: query.vehicleId || undefined,
              },
            },
          }),
        ),
        readVehicles ? vehiclesApi.list() : Promise.resolve([]),
      ]);
      return {
        cards: page.content.map(presentCard),
        vehicles: vehicles
          .filter((vehicle) => vehicle.active)
          .map((vehicle) => ({
            id: vehicle.id,
            label: `${vehicle.plate} · ${vehicle.model}`,
          })),
        statusOptions: Object.values(cardStatuses),
        totalElements: page.totalElements,
        totalPages: page.totalPages,
        page: page.number,
      };
    },
    async findCard(id) {
      return presentCard(
        await result(apiClient.GET('/api/v1/fuel-cards/{id}', { params: { path: { id } } })),
      );
    },
    async createCard(values) {
      const parsed = apiFormSchema.parse(values);
      return result(
        apiClient.POST('/api/v1/fuel-cards', {
          body: {
            ...body(parsed),
            cardNumber: parsed.number,
            ...(parsed.availableBalance
              ? { availableBalance: decimal(parsed.availableBalance) }
              : {}),
          },
        }),
      );
    },
    async editCard(id, values) {
      const parsed = this.editSchema.parse(values);
      return result(
        apiClient.PUT('/api/v1/fuel-cards/{id}', {
          params: { path: { id } },
          body: {
            ...body(parsed),
            availableBalance: decimal(parsed.availableBalance!),
          },
        }),
      );
    },
    async changeStatus(id, status) {
      const code = statusCode(status);
      if (!code) throw new Error('Status inválido.');
      await result(
        apiClient.PATCH('/api/v1/fuel-cards/{id}/status', {
          params: { path: { id } },
          body: { status: code },
        }),
      );
    },
    async linkVehicle(id, vehicleId) {
      await result(
        apiClient.POST('/api/v1/fuel-cards/{id}/bind-vehicle', {
          params: { path: { id } },
          body: { vehicleId },
        }),
      );
    },
    async unlinkVehicle(id) {
      await result(
        apiClient.DELETE('/api/v1/fuel-cards/{id}/bind-vehicle', { params: { path: { id } } }),
      );
    },
  };
}
