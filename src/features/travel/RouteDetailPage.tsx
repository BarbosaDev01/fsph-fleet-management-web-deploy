import { useState } from 'react';
import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { FormSpec } from '@/features/registry/RegistryScreen';
import { ActionForm } from '@/shared/components/ActionForm';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { DataTable } from '@/shared/components/DataTable';
import { PageHeading } from '@/shared/components/PageHeading';
import { dateTime, dateTimeInput, statusLabels } from '@/shared/format';
import { routesApi } from './api';
import { scheduleBody, scheduleFields } from './schedule';
import { useAccess } from '@/features/auth/access';
import { driversApi } from '@/features/registry/api';

export function RouteDetailPage() {
  const { can, user } = useAccess();
  const { id = '' } = useParams();
  const [form, setForm] = useState<FormSpec | null>(null);
  const query = useQuery({
    queryKey: ['travel', 'route', id],
    queryFn: ({ signal }) => routesApi.find(id, signal),
  });
  const stops = useQuery({
    queryKey: ['travel', 'stops', id],
    queryFn: ({ signal }) => routesApi.stops(id, signal),
  });
  const route = query.data;
  // Without ROUTES_MANAGE the API returns only this user's assigned routes.
  // A manager with execution permission also needs to own the assignment (except ADMIN).
  const verifyAssignment =
    can('ROUTES_EXECUTE') && can('ROUTES_MANAGE') && user?.role !== 'ADMIN' && !route?.driverUserId;
  const driver = useQuery({
    queryKey: ['registry', 'driver', route?.driverId],
    queryFn: () => driversApi.find(route!.driverId),
    enabled: verifyAssignment && can('DRIVERS_READ') && Boolean(route),
  });
  const assignedUserId = route?.driverUserId ?? driver.data?.userId;
  const executable =
    can('ROUTES_EXECUTE') &&
    (user?.role === 'ADMIN' ||
      (assignedUserId ? assignedUserId === user?.id : !can('ROUTES_MANAGE')));
  return (
    <Stack spacing={2}>
      <Button component={Link} to="/viagens" sx={{ alignSelf: 'flex-start' }}>
        Voltar às viagens
      </Button>
      <PageHeading title="Detalhes da viagem" />
      <ApiFeedback
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Loading />}
      {route && (
        <>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">
                {route.vehiclePlate} · {route.driverName}
              </Typography>
              <Chip sx={{ alignSelf: 'flex-start' }} label={statusLabels[route.status]} />
              <Typography>Saída prevista: {dateTime(route.plannedStartAt)}</Typography>
              <Typography>
                Retorno previsto: {dateTime(route.plannedReturnAt)} · {route.plannedDurationMinutes}{' '}
                minutos
              </Typography>
              <Typography>
                Início: {dateTime(route.realStartAt)} · {route.startMileage ?? '—'} km
              </Typography>
              <Typography>
                Término: {dateTime(route.realEndAt)} · {route.endMileage ?? '—'} km
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {route.status === 'PLANNED' && (
                  <>
                    {can('ROUTES_MANAGE') && (
                      <Button
                        variant="outlined"
                        onClick={() =>
                          setForm({
                            title: 'Reagendar viagem',
                            fields: scheduleFields,
                            defaults: {
                              plannedStartAt: dateTimeInput(route.plannedStartAt),
                              plannedDurationMinutes: String(route.plannedDurationMinutes),
                            },
                            submit: (values) => routesApi.schedule(id, scheduleBody(values)),
                          })
                        }
                      >
                        Reagendar
                      </Button>
                    )}
                    {executable && (
                      <Button
                        variant="contained"
                        onClick={() =>
                          setForm({
                            title: 'Iniciar viagem',
                            fields: [
                              {
                                name: 'startMileage',
                                label: 'Quilometragem inicial (km)',
                                type: 'number',
                                min: 0,
                                required: true,
                              },
                            ],
                            submit: (values) =>
                              routesApi.start(id, { startMileage: Number(values.startMileage) }),
                          })
                        }
                      >
                        Iniciar viagem
                      </Button>
                    )}
                    {can('ROUTES_MANAGE') && (
                      <Button
                        color="error"
                        onClick={() =>
                          setForm({
                            title: 'Cancelar esta viagem?',
                            fields: [],
                            submit: () => routesApi.cancel(id),
                          })
                        }
                      >
                        Cancelar viagem
                      </Button>
                    )}
                  </>
                )}
                {route.status === 'IN_PROGRESS' && executable && (
                  <Button
                    variant="contained"
                    onClick={() =>
                      setForm({
                        title: 'Concluir viagem',
                        fields: [
                          {
                            name: 'endMileage',
                            label: 'Quilometragem final (km)',
                            type: 'number',
                            min: route.startMileage ?? 0,
                            required: true,
                          },
                        ],
                        submit: (values) =>
                          routesApi.complete(id, { endMileage: Number(values.endMileage) }),
                      })
                    }
                  >
                    Concluir viagem
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
          <PageHeading
            title="Paradas"
            action={
              route.status === 'PLANNED' &&
              can('ROUTES_MANAGE') && (
                <Button
                  variant="outlined"
                  onClick={() =>
                    setForm({
                      title: 'Adicionar parada',
                      fields: [
                        {
                          name: 'transportId',
                          label: 'ID do transporte',
                          required: true,
                          helper:
                            'Copie o identificador na tela de detalhes do transporte pendente.',
                        },
                        {
                          name: 'stopSequence',
                          label: 'Ordem da parada',
                          type: 'number',
                          min: 1,
                          required: true,
                        },
                      ],
                      defaults: {
                        stopSequence: String(
                          Math.max(0, ...(stops.data ?? []).map((stop) => stop.stopSequence)) + 1,
                        ),
                      },
                      submit: (values) =>
                        routesApi.addStop(id, {
                          transportId: values.transportId!,
                          stopSequence: Number(values.stopSequence),
                        }),
                    })
                  }
                >
                  Adicionar parada
                </Button>
              )
            }
          />
          <ApiFeedback
            error={stops.error}
            retry={() => {
              void stops.refetch();
            }}
          />
          {stops.isPending ? (
            <Loading />
          ) : (
            !stops.error && (
              <DataTable
                rows={[...(stops.data ?? [])].sort((a, b) => a.stopSequence - b.stopSequence)}
                columns={[
                  { label: 'Ordem', render: (row) => row.stopSequence },
                  { label: 'Serviço', render: (row) => row.serviceType },
                  { label: 'Origem', render: (row) => row.pickupLocation },
                  { label: 'Destino', render: (row) => row.destination },
                  { label: 'Situação', render: (row) => statusLabels[row.status] },
                ]}
                actions={(stop) => (
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1 }}>
                    {executable && stop.status === 'PENDING' && route.status === 'IN_PROGRESS' && (
                      <Button
                        size="small"
                        onClick={() =>
                          setForm({
                            title: `Concluir a parada ${stop.stopSequence}?`,
                            fields: [],
                            submit: () => routesApi.completeStop(id, stop.id),
                          })
                        }
                      >
                        Concluir
                      </Button>
                    )}
                    {stop.status === 'PENDING' &&
                      ((route.status === 'PLANNED' && can('ROUTES_MANAGE')) ||
                        (route.status === 'IN_PROGRESS' && executable)) && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() =>
                            setForm({
                              title: `Cancelar a parada ${stop.stopSequence}?`,
                              fields: [],
                              submit: () => routesApi.cancelStop(id, stop.id),
                            })
                          }
                        >
                          Cancelar
                        </Button>
                      )}
                  </Stack>
                )}
              />
            )
          )}
        </>
      )}
      <ActionForm form={form} onClose={() => setForm(null)} />
    </Stack>
  );
}
