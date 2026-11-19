import { apiClient } from '@/shared/api/client';
import { result } from '@/shared/api/result';
import type { Dto } from '@/shared/api/types';

export type SvoRequest = Dto['SvoDeathRequestResponse'];
export type SvoStatus = SvoRequest['status'];
export const svoStatuses: Record<SvoStatus, string> = {
  PENDING_TRIAGE: 'Pendente de triagem',
  TRIAGED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELED: 'Cancelada',
  ORDER_GENERATED: 'Ordem gerada',
};
export const svoApi = {
  list: (
    query: { page?: number; size?: number; status?: SvoStatus; search?: string },
    signal?: AbortSignal,
  ) =>
    result(
      apiClient.GET('/api/v1/svo/requests', {
        params: { query: { ...query, sort: ['createdAt,desc'] } },
        signal,
      }),
    ),
  mine: (page: number, signal?: AbortSignal) =>
    result(
      apiClient.GET('/api/v1/svo/requests/my-requests', {
        params: { query: { page, size: 20 } },
        signal,
      }),
    ),
  find: (id: string, signal?: AbortSignal) =>
    result(apiClient.GET('/api/v1/svo/requests/{id}', { params: { path: { id } }, signal })),
  triage: (id: string, approved: boolean, rejectionReason?: string) =>
    result(
      apiClient.PATCH('/api/v1/svo/requests/{id}/triage', {
        params: { path: { id } },
        body: { approved, ...(approved ? {} : { rejectionReason: rejectionReason?.trim() }) },
      }),
    ),
};
