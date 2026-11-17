import { useState } from 'react';
import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAccess } from '@/features/auth/access';
import { ActionForm } from '@/shared/components/ActionForm';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { PageHeading } from '@/shared/components/PageHeading';
import type { FormSpec } from '@/shared/components/FormDialog';
import { dateTime } from '@/shared/format';
import { tripRequestsApi, requestStatusLabels } from './api';
import { requestBody, requestDateInput, requestFields } from './form';

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const { can, user } = useAccess();
  const [form, setForm] = useState<FormSpec | null>(null);
  const query = useQuery({
    queryKey: ['request', id],
    queryFn: ({ signal }) => tripRequestsApi.find(id, signal),
  });
  const request = query.data;
  const manage = can('TRIP_REQUESTS_MANAGE');
  const availability = useQuery({
    queryKey: ['request-availability', id],
    queryFn: ({ signal }) => tripRequestsApi.availability(id, signal),
    enabled: manage && Boolean(request && ['PENDING', 'APPROVED'].includes(request.status)),
  });
  const owned = can('TRIP_REQUESTS_WRITE') && request?.requesterId === user?.id;
  const editable = owned && request?.status === 'PENDING';
  const available = availability.data;
  return (
    <Stack spacing={3}>
      <Button component={Link} to="/solicitacoes" sx={{ alignSelf: 'flex-start' }}>
        Voltar às solicitações
      </Button>
      <PageHeading title="Detalhes da solicitação" />
      <ApiFeedback
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Loading />}
      {request && (
        <>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.5}>
              <Chip
                label={requestStatusLabels[request.status]}
                sx={{ alignSelf: 'flex-start' }}
                color={request.status === 'SCHEDULED' ? 'success' : 'default'}
              />
              <Typography variant="h6" component="h2">
                {request.origin} → {request.destination}
              </Typography>
              <Typography>Finalidade: {request.purpose}</Typography>
              <Typography>
                Solicitante: {request.requesterName ?? '—'} ·{' '}
                {request.requesterSectorName ?? 'Sem setor'}
              </Typography>
              <Typography>
                Saída: {dateTime(request.departureAt)} · Retorno:{' '}
                {dateTime(request.expectedReturnAt)}
              </Typography>
              <Typography>Passageiros: {request.passengerCount}</Typography>
              <Typography>
                Veículo solicitado: {request.requestedVehiclePlate ?? 'Sem preferência'}
              </Typography>
              <Typography>
                Veículo agendado: {request.assignedVehiclePlate ?? 'Não atribuído'} · Motorista:{' '}
                {request.assignedDriverName ?? 'Não atribuído'}
              </Typography>
              {request.decisionNotes && (
                <Typography>Observações da decisão: {request.decisionNotes}</Typography>
              )}
              {request.rejectionReason && (
                <Alert severity="info">Justificativa da rejeição: {request.rejectionReason}</Alert>
              )}
              <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>
                Identificador: {request.id}
              </Typography>
            </Stack>
          </Paper>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {editable && (
              <>
                <Button
                  variant="outlined"
                  onClick={() =>
                    setForm({
                      title: 'Editar solicitação',
                      fields: requestFields,
                      defaults: {
                        origin: request.origin,
                        destination: request.destination,
                        purpose: request.purpose,
                        passengerCount: String(request.passengerCount),
                        departureAt: requestDateInput(request.departureAt),
                        expectedReturnAt: requestDateInput(request.expectedReturnAt),
                      },
                      submit: (values) =>
                        tripRequestsApi.update(id, {
                          ...requestBody(values),
                          ...(request.requestedVehicleId
                            ? { requestedVehicleId: request.requestedVehicleId }
                            : {}),
                        }),
                    })
                  }
                >
                  Editar solicitação
                </Button>
                <Button
                  color="error"
                  onClick={() =>
                    setForm({
                      title: 'Cancelar esta solicitação?',
                      fields: [],
                      submit: () => tripRequestsApi.cancel(id),
                    })
                  }
                >
                  Cancelar solicitação
                </Button>
              </>
            )}
            {manage && request.status === 'PENDING' && (
              <>
                <Button
                  variant="contained"
                  onClick={() =>
                    setForm({
                      title: 'Aprovar solicitação',
                      fields: [
                        { name: 'decisionNotes', label: 'Observações da decisão', maxLength: 500 },
                      ],
                      submit: (values) =>
                        tripRequestsApi.approve(id, {
                          decisionNotes: values.decisionNotes?.trim() || undefined,
                        }),
                    })
                  }
                >
                  Aprovar solicitação
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() =>
                    setForm({
                      title: 'Rejeitar solicitação',
                      fields: [
                        {
                          name: 'rejectionReason',
                          label: 'Justificativa',
                          required: true,
                          maxLength: 500,
                        },
                      ],
                      submit: (values) =>
                        tripRequestsApi.reject(id, {
                          rejectionReason: values.rejectionReason!.trim(),
                        }),
                    })
                  }
                >
                  Rejeitar solicitação
                </Button>
              </>
            )}
            {manage && request.status === 'APPROVED' && (
              <Button
                variant="contained"
                disabled={
                  !available?.availableVehicles.length ||
                  !available.availableDrivers.length ||
                  availability.isFetching ||
                  Boolean(availability.error)
                }
                onClick={() =>
                  setForm({
                    title: 'Agendar solicitação aprovada',
                    fields: [
                      {
                        name: 'vehicleId',
                        label: 'Veículo disponível',
                        required: true,
                        options: available!.availableVehicles.map((vehicle) => ({
                          value: vehicle.id,
                          label: `${vehicle.plate} · ${vehicle.model} · ${vehicle.availablePassengerSeats} vagas`,
                        })),
                      },
                      {
                        name: 'driverId',
                        label: 'Motorista disponível',
                        required: true,
                        options: available!.availableDrivers.map((driver) => ({
                          value: driver.driverId,
                          label: driver.name,
                        })),
                      },
                    ],
                    submit: (values) =>
                      tripRequestsApi.schedule(id, {
                        vehicleId: values.vehicleId!,
                        driverId: values.driverId!,
                      }),
                  })
                }
              >
                Agendar viagem
              </Button>
            )}
          </Stack>
          {manage && ['PENDING', 'APPROVED'].includes(request.status) && (
            <Stack spacing={2}>
              <Typography component="h2" variant="h6">
                Disponibilidade para o período
              </Typography>
              <ApiFeedback
                error={availability.error}
                retry={() => {
                  void availability.refetch();
                }}
              />
              {availability.isPending && <Loading />}
              {available && !availability.error && (
                <Alert
                  severity={
                    available.availableVehicles.length && available.availableDrivers.length
                      ? 'info'
                      : 'warning'
                  }
                >
                  {available.availableVehicles.length} veículo(s) e{' '}
                  {available.availableDrivers.length} motorista(s) disponíveis. A API valida
                  novamente capacidade, CNH, manutenção e conflitos ao agendar.
                </Alert>
              )}
            </Stack>
          )}
          {request.status === 'SCHEDULED' && (
            <Alert severity="success">
              Agendamento confirmado pela API. A execução da viagem é uma operação separada.
            </Alert>
          )}
        </>
      )}
      <ActionForm form={form} onClose={() => setForm(null)} />
    </Stack>
  );
}
