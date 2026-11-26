import { apiClient } from '@/shared/api/client';
import { result } from '@/shared/api/result';
import type { Dto } from '@/shared/api/types';

export type SvoOrder = Dto['SvoOrderResponse'];
export type OrderStatus = SvoOrder['status'];
export const orderStatuses: Record<OrderStatus, string> = {
  WAITING_ASSIGNMENT: 'Aguardando atribuição',
  ASSIGNED: 'Equipe atribuída',
  IN_PROGRESS: 'Em deslocamento',
  COLLECTED: 'Coletada',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelada',
};
export const transitionLabels: Partial<Record<OrderStatus, string>> = {
  IN_PROGRESS: 'Iniciar deslocamento',
  COLLECTED: 'Registrar coleta',
  DELIVERED: 'Concluir entrega',
  CANCELED: 'Cancelar ordem',
};
export type OrderFilters = {
  page?: number;
  size?: number;
  status?: OrderStatus;
  search?: string;
  from?: string;
  to?: string;
  teamId?: string;
  vehicleId?: string;
  requestId?: string;
};
export const ordersApi = {
  list: (query: OrderFilters, signal?: AbortSignal) =>
    result(apiClient.GET('/api/v1/svo/orders', { params: { query }, signal })),
  find: (id: string, signal?: AbortSignal) =>
    result(apiClient.GET('/api/v1/svo/orders/{id}', { params: { path: { id } }, signal })),
  generate: (id: string) =>
    result(apiClient.POST('/api/v1/svo/requests/{id}/order', { params: { path: { id } } })),
  resources: (id: string, signal?: AbortSignal) =>
    result(
      apiClient.GET('/api/v1/svo/orders/{id}/resources', { params: { path: { id } }, signal }),
    ),
  assign: (id: string, body: Dto['AssignSvoOrderRequest']) =>
    result(apiClient.PUT('/api/v1/svo/orders/{id}/assignment', { params: { path: { id } }, body })),
  transition: (id: string, body: Dto['TransitionSvoOrderRequest']) =>
    result(apiClient.PATCH('/api/v1/svo/orders/{id}/status', { params: { path: { id } }, body })),
  note: (id: string, body: Dto['AddSvoOrderNoteRequest']) =>
    result(apiClient.POST('/api/v1/svo/orders/{id}/notes', { params: { path: { id } }, body })),
  report: (
    query: Pick<OrderFilters, 'from' | 'to' | 'teamId' | 'vehicleId'>,
    signal?: AbortSignal,
  ) => result(apiClient.GET('/api/v1/svo/orders/report', { params: { query }, signal })),
};
export function dateTime(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(
        new Date(value),
      )
    : 'Não informado';
}
export function minutes(value?: number | null) {
  return value == null
    ? 'Sem dados'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} min`;
}
export function localInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
