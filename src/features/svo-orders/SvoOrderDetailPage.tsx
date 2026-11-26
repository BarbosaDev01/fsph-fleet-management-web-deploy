import { useState } from 'react';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccess } from '@/features/auth/access';
import { ApiError, errorMessage } from '@/shared/api/result';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { PageHeading } from '@/shared/components/PageHeading';
import {
  dateTime,
  localInput,
  ordersApi,
  orderStatuses,
  transitionLabels,
  type SvoOrder,
  type OrderStatus as OrderStatusValue,
} from './api';
import { OrderStatus, OrderSummary } from './OrderSummary';

type Save = (action: () => Promise<SvoOrder>, message: string) => Promise<boolean>;
function AssignmentForm({ order, busy, save }: { order: SvoOrder; busy: boolean; save: Save }) {
  const resources = useQuery({
    queryKey: ['svo-order-resources', order.id],
    queryFn: ({ signal }) => ordersApi.resources(order.id, signal),
    retry: false,
  });
  const [driverId, setDriver] = useState(order.driverId ?? '');
  const [vehicleId, setVehicle] = useState(order.vehicleId ?? '');
  const [teamId, setTeam] = useState(order.teamId ?? '');
  const [scheduledAt, setScheduled] = useState(localInput(order.scheduledAt));
  const [returnAt, setReturn] = useState(localInput(order.plannedReturnAt));
  const [deadline, setDeadline] = useState(localInput(order.collectionDeadlineAt));
  return (
    <Paper component="section" variant="outlined" sx={{ p: 2.5 }}>
      <Stack
        spacing={2}
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void save(
            () =>
              ordersApi.assign(order.id, {
                expectedVersion: order.version,
                driverId,
                vehicleId,
                teamId: teamId || undefined,
                scheduledAt: new Date(scheduledAt).toISOString(),
                plannedReturnAt: new Date(returnAt).toISOString(),
                collectionDeadlineAt: deadline ? new Date(deadline).toISOString() : undefined,
              }),
            'Atribuição salva.',
          );
        }}
      >
        <Typography component="h2" variant="h3">
          Atribuir recursos para este atendimento
        </Typography>
        {resources.isPending ? (
          <Loading />
        ) : resources.isError ? (
          <ApiFeedback error={resources.error} retry={() => void resources.refetch()} />
        ) : (
          <>
            {(
              [
                ['Motorista', driverId, setDriver, resources.data.drivers],
                ['Veículo', vehicleId, setVehicle, resources.data.vehicles],
                ['Equipe', teamId, setTeam, resources.data.teams],
              ] as const
            ).map(([label, value, change, options]) => (
              <TextField
                select
                key={label}
                label={label}
                value={value}
                onChange={(e) => change(e.target.value)}
                required={label !== 'Equipe'}
                disabled={busy}
              >
                <MenuItem value="">{label === 'Equipe' ? 'Sem equipe' : 'Selecione'}</MenuItem>
                {options.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            ))}
            <TextField
              label="Agendamento"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduled(e.target.value)}
              required
              disabled={busy}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Retorno previsto"
              type="datetime-local"
              value={returnAt}
              onChange={(e) => setReturn(e.target.value)}
              required
              disabled={busy}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Prazo de coleta"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={busy}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Opcional. Sem prazo registrado, a ordem será sinalizada como sem prazo definido."
            />
            <Button
              type="submit"
              variant="contained"
              disabled={busy || !driverId || !vehicleId || !scheduledAt || !returnAt}
            >
              Salvar atribuição
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
function OrderActions({
  order,
  busy,
  save,
  canNote,
}: {
  order: SvoOrder;
  busy: boolean;
  save: Save;
  canNote: boolean;
}) {
  const [text, setText] = useState('');
  const transitions = order.allowedTransitions;
  async function transition(status: OrderStatusValue) {
    if (
      await save(
        () =>
          ordersApi.transition(order.id, {
            expectedVersion: order.version,
            status,
            observation: text.trim() || undefined,
          }),
        'Etapa atualizada.',
      )
    )
      setText('');
  }
  async function note() {
    if (
      await save(
        () => ordersApi.note(order.id, { expectedVersion: order.version, text: text.trim() }),
        'Providência registrada.',
      )
    )
      setText('');
  }
  if (!transitions.length && !canNote) return null;
  return (
    <Paper component="section" variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography component="h2" variant="h3">
          Registrar atendimento
        </Typography>
        <TextField
          label={canNote ? 'Providência ou observação' : 'Observação em campo'}
          multiline
          minRows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
          helperText={`${text.length}/2000 caracteres`}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, flexWrap: 'wrap' }}>
          {transitions.map((status) => (
            <Button
              key={status}
              variant={status === 'CANCELED' ? 'outlined' : 'contained'}
              color={status === 'CANCELED' ? 'error' : 'primary'}
              disabled={busy}
              onClick={() => void transition(status)}
            >
              {transitionLabels[status]}
            </Button>
          ))}
          {canNote && (
            <Button variant="outlined" disabled={busy || !text.trim()} onClick={() => void note()}>
              Registrar providência
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
export function SvoOrderDetailPage() {
  const { id = '' } = useParams();
  const { user, can } = useAccess();
  const client = useQueryClient();
  const key = ['svo-orders', user?.id, 'detail', id] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => ordersApi.find(id, signal),
    enabled: can('SVO_ORDERS_READ'),
    retry: false,
    refetchInterval: 30000,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const save: Save = async (action, message) => {
    if (busy) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await action();
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, updated);
      setNotice(message);
      await client.invalidateQueries({ queryKey: ['svo-orders', user?.id, 'list'] });
      await client.invalidateQueries({ queryKey: ['svo-report', user?.id] });
      return true;
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'A ordem foi alterada ou a operação conflita com o estado atual. Confira os dados atualizados antes de tentar novamente. ' +
              errorMessage(e)
          : errorMessage(e),
      );
      if (e instanceof ApiError && e.status === 409) await query.refetch();
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (!can('SVO_ORDERS_READ'))
    return <Alert severity="warning">Acesso restrito às coletas SVO.</Alert>;
  if (query.isPending) return <Loading />;
  if (query.isError) return <ApiFeedback error={query.error} retry={() => void query.refetch()} />;
  const order = query.data;
  const canAssign =
    can('SVO_ORDERS_MANAGE') &&
    ['ADMIN', 'GESTOR_FROTA', 'GESTOR_SVO'].includes(user?.role ?? '') &&
    ['WAITING_ASSIGNMENT', 'ASSIGNED'].includes(order.status);
  const canNote =
    can('SVO_ORDERS_NOTES') && ['ADMIN', 'ATENDENTE_SVO', 'GESTOR_SVO'].includes(user?.role ?? '');
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeading
        title={order.protocolNumber}
        description={`Ordem de coleta · ${order.sectorName}`}
        action={
          <Button disabled={busy} onClick={() => void query.refetch()}>
            Atualizar ordem
          </Button>
        }
      />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
        <Button component={Link} to="/coletas-svo">
          Voltar às coletas
        </Button>
        {can('SVO_REQUESTS_READ') && (
          <Button component={Link} to={`/atendimento-svo?requestId=${order.requestId}`}>
            Abrir triagem de origem
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={3}>
          <OrderStatus order={order} />
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            Ordem: {order.id}
          </Typography>
          <OrderSummary order={order} />
        </Stack>
      </Paper>
      {canAssign && (
        <AssignmentForm key={`assignment-${order.id}`} order={order} busy={busy} save={save} />
      )}
      <OrderActions
        key={`actions-${order.id}`}
        order={order}
        busy={busy}
        save={save}
        canNote={canNote}
      />
      <Paper component="section" aria-label="Histórico da ordem" variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography component="h2" variant="h3">
            Histórico da ordem
          </Typography>
          {order.events.map((e) => (
            <Stack key={e.id} spacing={0.5} sx={{ borderLeft: 3, borderColor: 'divider', pl: 2 }}>
              <Typography sx={{ fontWeight: 600 }}>
                {e.type === 'NOTE'
                  ? 'Providência'
                  : e.type === 'ASSIGNED'
                    ? 'Atribuição'
                    : e.type === 'CREATED'
                      ? 'Ordem criada'
                      : `${e.fromStatus ? orderStatuses[e.fromStatus] + ' → ' : ''}${orderStatuses[e.toStatus]}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {e.authorName} · {dateTime(e.occurredAt)}
              </Typography>
              {e.text && (
                <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {e.text}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
