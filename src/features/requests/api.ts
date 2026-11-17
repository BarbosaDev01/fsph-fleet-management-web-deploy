import { apiClient } from '@/shared/api/client';
import { result } from '@/shared/api/result';
import type { Dto } from '@/shared/api/types';

export type TripRequest = Dto['TripRequestResponse'];
export type RequestStatus = TripRequest['status'];
export const requestStatusLabels: Record<RequestStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SCHEDULED: 'Agendada',
  CANCELED: 'Cancelada',
};
export const tripRequestsApi = {
  list: (mine: boolean, status?: RequestStatus, signal?: AbortSignal) =>
    mine
      ? result(
          apiClient.GET('/api/v1/trip-requests/mine', { params: { query: { status } }, signal }),
        )
      : result(apiClient.GET('/api/v1/trip-requests', { params: { query: { status } }, signal })),
  find: (id: string, signal?: AbortSignal) =>
    result(apiClient.GET('/api/v1/trip-requests/{id}', { params: { path: { id } }, signal })),
  create: (body: Dto['CreateTripRequest']) =>
    result(apiClient.POST('/api/v1/trip-requests', { body })),
  update: (id: string, body: Dto['UpdateTripRequest']) =>
    result(apiClient.PUT('/api/v1/trip-requests/{id}', { params: { path: { id } }, body })),
  cancel: (id: string) =>
    result(apiClient.PATCH('/api/v1/trip-requests/{id}/cancel', { params: { path: { id } } })),
  approve: (id: string, body: Dto['ApproveTripRequest']) =>
    result(
      apiClient.PATCH('/api/v1/trip-requests/{id}/approve', { params: { path: { id } }, body }),
    ),
  reject: (id: string, body: Dto['RejectTripRequest']) =>
    result(
      apiClient.PATCH('/api/v1/trip-requests/{id}/reject', { params: { path: { id } }, body }),
    ),
  availability: (id: string, signal?: AbortSignal) =>
    result(
      apiClient.GET('/api/v1/trip-requests/{id}/availability', {
        params: { path: { id } },
        signal,
      }),
    ),
  schedule: (id: string, body: Dto['ScheduleTripRequest']) =>
    result(
      apiClient.PATCH('/api/v1/trip-requests/{id}/schedule', { params: { path: { id } }, body }),
    ),
};
