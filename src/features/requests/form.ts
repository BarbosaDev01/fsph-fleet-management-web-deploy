import { ApiError } from '@/shared/api/result';
import type { Dto } from '@/shared/api/types';
import type { Field, FormValues } from '@/shared/components/FormDialog';

export const requestFields: Field[] = [
  { name: 'origin', label: 'Origem', required: true, maxLength: 200 },
  { name: 'destination', label: 'Destino', required: true, maxLength: 200 },
  { name: 'purpose', label: 'Finalidade', required: true, maxLength: 500 },
  {
    name: 'departureAt',
    label: 'Saída prevista',
    type: 'datetime-local',
    required: true,
    helper: 'Horário de Fortaleza (UTC−3).',
  },
  {
    name: 'expectedReturnAt',
    label: 'Retorno previsto',
    type: 'datetime-local',
    required: true,
    helper: 'Deve ser posterior à saída. Horário de Fortaleza (UTC−3).',
  },
  {
    name: 'passengerCount',
    label: 'Número de passageiros',
    type: 'number',
    required: true,
    min: 1,
    helper: 'Não inclua o motorista na quantidade de passageiros.',
  },
];

export function requestBody(values: FormValues): Dto['CreateTripRequest'] {
  const departureAt = new Date(`${values.departureAt}-03:00`);
  const expectedReturnAt = new Date(`${values.expectedReturnAt}-03:00`);
  if (
    !Number.isFinite(departureAt.getTime()) ||
    !Number.isFinite(expectedReturnAt.getTime()) ||
    expectedReturnAt <= departureAt
  )
    throw new ApiError(400, {
      detail: 'Revise o período da solicitação.',
      violations: [{ field: 'expectedReturnAt', message: 'O retorno deve ser posterior à saída.' }],
    });
  return {
    origin: values.origin!.trim(),
    destination: values.destination!.trim(),
    purpose: values.purpose!.trim(),
    passengerCount: Number(values.passengerCount),
    departureAt: departureAt.toISOString(),
    expectedReturnAt: expectedReturnAt.toISOString(),
  };
}

export function requestDateInput(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
