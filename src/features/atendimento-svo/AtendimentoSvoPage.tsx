import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccess } from '@/features/auth/access';
import { ApiError, errorMessage } from '@/shared/api/result';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { PageHeading } from '@/shared/components/PageHeading';
import { SummaryCard } from '@/shared/components/SummaryCard';
import { svoApi, svoStatuses, type SvoStatus, type SvoRequest } from './api';

const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Não informado';
const locations = {
  DOMICILE: 'Domicílio',
  PUBLIC_WAY: 'Via pública',
  HOSPITAL: 'Hospital',
  HEALTH_POST: 'Unidade de saúde',
  OTHER: 'Outro',
};
function Fields({ fields }: { fields: [string, string | number | null | undefined][] }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 2.5,
      }}
    >
      {fields.map(([label, value]) => (
        <Box key={label}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography component="dd" sx={{ m: 0, mt: 0.5, overflowWrap: 'anywhere' }}>
            {value ?? 'Não informado'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
function Status({ status }: { status: SvoStatus }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={svoStatuses[status]}
      color={
        status === 'PENDING_TRIAGE'
          ? 'warning'
          : status === 'REJECTED'
            ? 'error'
            : status === 'CANCELED'
              ? 'default'
              : status === 'ORDER_GENERATED'
                ? 'info'
                : 'success'
      }
    />
  );
}
function Details({ request }: { request: SvoRequest }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)' },
        gap: 3,
        alignItems: 'start',
      }}
    >
      <Paper
        component="section"
        variant="outlined"
        aria-label={request.protocolNumber}
        sx={{ p: 2.5 }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
          <Typography component="h2" variant="h3" sx={{ overflowWrap: 'anywhere' }}>
            {request.protocolNumber}
          </Typography>
          <Status status={request.status} />
        </Stack>
        <Fields
          fields={[
            ['Nome do falecido', request.deceasedName],
            ['Idade', request.deceasedAge],
            ['Gênero', request.deceasedGender],
            ['Data e hora do óbito', dateTime(request.occurredAt)],
            ['Tipo de local', locations[request.deathLocationType]],
            ['Endereço', request.address],
            ['Bairro', request.neighborhood],
            ['Cidade', request.city],
            ['Referência', request.referencePoint],
            ['Contato', request.contactName],
            ['Telefone', request.contactPhone],
            ['Vínculo com o falecido', request.relationshipWithDeceased],
            ['Circunstância presumida', request.presumedCircumstance],
            ['Observações', request.notes],
          ]}
        />
        {request.hasSuspectedViolence && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            Suspeita de violência ou causa externa: o serviço não permite aprovação pelo SVO.
            Competência do IML.
          </Alert>
        )}
      </Paper>
      <Paper
        component="aside"
        variant="outlined"
        aria-label="Registro da solicitação"
        sx={{ p: 2.5 }}
      >
        <Typography component="h2" variant="h3" sx={{ mb: 3 }}>
          Registro e triagem
        </Typography>
        <Fields
          fields={[
            ['Solicitante', request.requesterName],
            ['E-mail do solicitante', request.requesterEmail],
            ['Entrada', dateTime(request.createdAt)],
            ['Responsável pela triagem', request.triagedByName],
            ['Triagem em', dateTime(request.triagedAt)],
            ['Justificativa da rejeição', request.rejectionReason],
            ['Última atualização', dateTime(request.updatedAt)],
          ]}
        />
      </Paper>
    </Box>
  );
}

export function AtendimentoSvoPage() {
  const { can, user } = useAccess();
  const canRead = can('SVO_REQUESTS_READ');
  const canQuery = canRead || can('SVO_REQUESTS_WRITE');
  const canManage = can('SVO_REQUESTS_MANAGE');
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<SvoStatus | ''>('PENDING_TRIAGE');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [notice, setNotice] = useState<{ text: string; severity: 'success' | 'warning' }>();
  const queue = useQuery({
    queryKey: ['svo', user?.id, 'queue', canRead, page, status, filter],
    enabled: canQuery,
    queryFn: ({ signal }) =>
      canRead
        ? svoApi.list(
            { page, size: 20, status: status || undefined, search: filter || undefined },
            signal,
          )
        : svoApi.mine(page, signal),
    retry: false,
  });
  const pending = useQuery({
    queryKey: ['svo', user?.id, 'pending'],
    enabled: canRead,
    queryFn: ({ signal }) => svoApi.list({ status: 'PENDING_TRIAGE', page: 0, size: 1 }, signal),
    retry: false,
  });
  const id = selectedId ?? queue.data?.content[0]?.id;
  const detail = useQuery({
    queryKey: ['svo', user?.id, 'detail', id],
    enabled: canQuery && Boolean(id),
    queryFn: ({ signal }) => svoApi.find(id!, signal),
    retry: false,
  });
  const request = detail.data;
  async function refresh(afterSave = false) {
    const [list, count, record] = await Promise.all([
      queue.refetch(),
      canRead ? pending.refetch() : undefined,
      id ? detail.refetch() : undefined,
    ]);
    if (list.data && page >= list.data.totalPages && page > 0)
      setPage(Math.max(0, list.data.totalPages - 1));
    if (afterSave && (list.isError || count?.isError || record?.isError))
      setNotice({
        text: 'Decisão gravada. Não foi possível atualizar todos os dados; tente atualizar novamente.',
        severity: 'warning',
      });
  }
  async function decide() {
    if (!request || !dialog || !canManage || busy || request.status !== 'PENDING_TRIAGE') return;
    if (dialog === 'reject' && (!reason.trim() || reason.trim().length > 500)) return;
    setBusy(true);
    setSelectedId(request.id);
    setOperationError('');
    try {
      const updated = await svoApi.triage(request.id, dialog === 'approve', reason);
      await client.cancelQueries({ queryKey: ['svo', user?.id, 'detail', request.id] });
      client.setQueryData(['svo', user?.id, 'detail', request.id], updated);
      setNotice({
        text: dialog === 'approve' ? 'Solicitação aprovada.' : 'Solicitação rejeitada.',
        severity: 'success',
      });
      setDialog(null);
      setReason('');
      await refresh(true);
    } catch (error) {
      let changed = false;
      if (error instanceof ApiError && [400, 409].includes(error.status)) {
        try {
          const current = await svoApi.find(request.id);
          client.setQueryData(['svo', user?.id, 'detail', request.id], current);
          changed = current.status !== 'PENDING_TRIAGE';
        } catch {
          /* Keep the original error and the justification. */
        }
      }
      if (changed) {
        setDialog(null);
        setNotice({
          text: 'Esta solicitação já foi triada ou deixou de estar pendente. O estado atual foi recarregado.',
          severity: 'warning',
        });
        await refresh();
      } else setOperationError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (!canQuery)
    return (
      <Alert severity="warning">
        Acesso restrito: seu perfil não permite consultar solicitações SVO.
      </Alert>
    );
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeading
        title="Atendimento SVO"
        description="Consulte as solicitações e registre a decisão de triagem."
        action={
          <Button variant="outlined" disabled={busy} onClick={() => void refresh()}>
            Atualizar
          </Button>
        }
      />
      {canRead && (
        <Box
          component="section"
          aria-label="Resumo da operação"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {(
            [
              [
                'Pendentes de triagem',
                pending.isPending
                  ? '…'
                  : pending.isError
                    ? 'Indisponível'
                    : pending.data.totalElements,
              ],
              ['Solicitações nos filtros', queue.data?.totalElements ?? '—'],
              ['Permissão', canManage ? 'Gerenciar triagem' : 'Somente consulta'],
            ] as const
          ).map(([label, value]) => (
            <SummaryCard
              key={label}
              title={label}
              value={value}
              compact={label === 'Permissão' || value === 'Indisponível'}
            />
          ))}
        </Box>
      )}
      {!canRead && (
        <Alert severity="info">
          Você pode consultar somente as suas solicitações. Os filtros globais exigem permissão de
          consulta SVO.
        </Alert>
      )}
      <ApiFeedback error={pending.error} retry={() => void pending.refetch()} />
      <Paper
        component="section"
        variant="outlined"
        aria-label="Fila de atendimento"
        sx={{ minWidth: 0 }}
      >
        <Stack spacing={2.5} sx={{ p: 2.5 }}>
          <Typography component="h2" variant="h3">
            Fila de atendimento
          </Typography>
          {canRead && (
            <Stack
              component="form"
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              onSubmit={(event) => {
                event.preventDefault();
                setPage(0);
                setSelectedId(undefined);
                setFilter(search.trim());
              }}
            >
              <TextField
                label="Buscar protocolo, nome ou endereço"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 0 }}
              />
              <TextField
                select
                label="Status"
                size="small"
                value={status}
                sx={{ minWidth: { sm: 200 } }}
                onChange={(event) => {
                  setStatus(event.target.value as SvoStatus | '');
                  setPage(0);
                  setSelectedId(undefined);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(svoStatuses).map(([value, label]) => (
                  <MenuItem value={value} key={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained">
                Buscar
              </Button>
            </Stack>
          )}
        </Stack>
        {queue.isPending ? (
          <Loading />
        ) : queue.isError ? (
          <ApiFeedback error={queue.error} retry={() => void queue.refetch()} />
        ) : (
          <>
            <TableContainer role="region" aria-label="Tabela da fila" tabIndex={0}>
              <Table size="small" aria-label="Solicitações SVO" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    {['Protocolo', 'Status', 'Entrada', 'Falecido', 'Cidade', 'Endereço'].map(
                      (label) => (
                        <TableCell key={label} scope="col" sx={{ py: 1.25 }}>
                          {label}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queue.data.content.map((item) => (
                    <TableRow
                      key={item.id}
                      selected={id === item.id}
                      hover
                      aria-selected={id === item.id}
                      sx={{ '& > th, & > td': { py: 1.5 } }}
                    >
                      <TableCell component="th" scope="row">
                        <Button
                          sx={{ whiteSpace: 'nowrap' }}
                          onClick={() => {
                            setSelectedId(item.id);
                            setOperationError('');
                          }}
                        >
                          {item.protocolNumber}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Status status={item.status} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {dateTime(item.createdAt)}
                      </TableCell>
                      <TableCell>{item.deceasedName ?? 'Não informado'}</TableCell>
                      <TableCell>{item.city}</TableCell>
                      <TableCell>{item.address}</TableCell>
                    </TableRow>
                  ))}
                  {!queue.data.content.length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                          Nenhuma solicitação encontrada.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {queue.data.totalPages > 1 && (
              <Pagination
                size="small"
                sx={{ p: 2, '& .MuiPagination-ul': { flexWrap: 'wrap' } }}
                aria-label="Páginas de solicitações SVO"
                count={queue.data.totalPages}
                page={page + 1}
                onChange={(_, value) => {
                  setPage(value - 1);
                  setSelectedId(undefined);
                }}
              />
            )}
          </>
        )}
      </Paper>
      {id && (
        <>
          {detail.isPending ? (
            <Loading />
          ) : detail.isError ? (
            <ApiFeedback error={detail.error} retry={() => void detail.refetch()} />
          ) : (
            request && (
              <>
                <Details request={request} />
                <Paper
                  component="section"
                  variant="outlined"
                  sx={{ p: 2.5 }}
                  aria-label="Ações da solicitação selecionada"
                >
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography component="h2" variant="h3">
                        Ações da solicitação selecionada
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.75, overflowWrap: 'anywhere' }}
                      >
                        {request.protocolNumber}
                      </Typography>
                    </Box>
                    {!canManage ? (
                      <Alert severity="info">
                        Seu perfil permite consulta. A decisão exige a permissão
                        SVO_REQUESTS_MANAGE.
                      </Alert>
                    ) : (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                          variant="outlined"
                          color="error"
                          disabled={busy || request.status !== 'PENDING_TRIAGE'}
                          onClick={() => {
                            setDialog('reject');
                            setOperationError('');
                          }}
                        >
                          Rejeitar solicitação
                        </Button>
                        <Button
                          variant="contained"
                          disabled={
                            busy ||
                            request.status !== 'PENDING_TRIAGE' ||
                            request.hasSuspectedViolence
                          }
                          onClick={() => {
                            setDialog('approve');
                            setOperationError('');
                          }}
                        >
                          Aprovar solicitação
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </>
            )
          )}
        </>
      )}
      <Dialog
        open={Boolean(dialog)}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="svo-decision-title"
      >
        <DialogTitle id="svo-decision-title">
          {dialog === 'approve' ? 'Aprovar solicitação?' : 'Rejeitar solicitação?'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {request?.protocolNumber} — A decisão será registrada no servidor.
          </Typography>
          {dialog === 'reject' && (
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              required
              label="Justificativa"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              helperText={`${reason.length}/500 caracteres`}
            />
          )}
          {operationError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {operationError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDialog(null)}>
            Voltar
          </Button>
          <Button
            variant="contained"
            disabled={busy || (dialog === 'reject' && !reason.trim())}
            onClick={() => void decide()}
          >
            {busy
              ? 'Salvando…'
              : dialog === 'approve'
                ? 'Confirmar aprovação'
                : 'Confirmar rejeição'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(notice)} autoHideDuration={7000} onClose={() => setNotice(undefined)}>
        <Alert severity={notice?.severity} onClose={() => setNotice(undefined)}>
          {notice?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
