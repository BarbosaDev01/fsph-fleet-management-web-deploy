import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Snackbar,
  Stack,
  TextField,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccess } from '@/features/auth/access';
import { ApiError, errorMessage } from '@/shared/api/result';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { svoApi, svoStatuses, type SvoStatus, type SvoRequest } from './api';
import './atendimento-svo.css';

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
    <dl className="svo-api-fields">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? 'Não informado'}</dd>
        </div>
      ))}
    </dl>
  );
}
function Details({ request }: { request: SvoRequest }) {
  return (
    <div className="detail-grid">
      <section className="request-card surface" aria-label={request.protocolNumber}>
        <div className="section-heading">
          <h2>{request.protocolNumber}</h2>
          <span>{svoStatuses[request.status]}</span>
        </div>
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
          <Alert severity="warning">
            Suspeita de violência ou causa externa: o serviço não permite aprovação pelo SVO.
            Competência do IML.
          </Alert>
        )}
      </section>
      <aside className="surface svo-api-audit" aria-label="Registro da solicitação">
        <h2>Registro e triagem</h2>
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
      </aside>
    </div>
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
    <div className="svo-app-shell">
      <section className="svo-main">
        <header className="page-header">
          <div>
            <h1>Atendimento SVO</h1>
            <p className="header-subtitle">
              Consulte as solicitações e registre a decisão de triagem.
            </p>
          </div>
          <Button disabled={busy} onClick={() => void refresh()}>
            Atualizar
          </Button>
        </header>
        {canRead && (
          <section className="summary-grid" aria-label="Resumo da operação">
            <div className="summary-item">
              <span>Pendentes de triagem</span>
              <strong>
                {pending.isPending
                  ? '…'
                  : pending.isError
                    ? 'Indisponível'
                    : pending.data.totalElements}
              </strong>
            </div>
            <div className="summary-item">
              <span>Solicitações nos filtros</span>
              <strong>{queue.data?.totalElements ?? '—'}</strong>
            </div>
            <div className="summary-item">
              <span>Permissão</span>
              <strong>{canManage ? 'Gerenciar triagem' : 'Somente consulta'}</strong>
            </div>
          </section>
        )}
        {!canRead && (
          <Alert severity="info">
            Você pode consultar somente as suas solicitações. Os filtros globais exigem permissão de
            consulta SVO.
          </Alert>
        )}
        <ApiFeedback error={pending.error} retry={() => void pending.refetch()} />
        <section className="queue-panel surface" aria-label="Fila de atendimento">
          <div className="section-heading queue-heading">
            <h2>Fila de atendimento</h2>
            {canRead && (
              <Stack
                component="form"
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
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
                />
                <TextField
                  select
                  label="Status"
                  size="small"
                  value={status}
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
                <Button type="submit">Buscar</Button>
              </Stack>
            )}
          </div>
          {queue.isPending ? (
            <Loading />
          ) : queue.isError ? (
            <ApiFeedback error={queue.error} retry={() => void queue.refetch()} />
          ) : (
            <>
              <div className="table-scroll" role="region" aria-label="Tabela da fila" tabIndex={0}>
                <table className="data-table queue-table">
                  <thead>
                    <tr>
                      {['Protocolo', 'Status', 'Entrada', 'Falecido', 'Cidade', 'Endereço'].map(
                        (label) => (
                          <th key={label}>{label}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {queue.data.content.map((item) => (
                      <tr
                        key={item.id}
                        className={id === item.id ? 'selected-row' : ''}
                        aria-selected={id === item.id}
                      >
                        <td>
                          <Button
                            onClick={() => {
                              setSelectedId(item.id);
                              setOperationError('');
                            }}
                          >
                            {item.protocolNumber}
                          </Button>
                        </td>
                        <td>{svoStatuses[item.status]}</td>
                        <td>{dateTime(item.createdAt)}</td>
                        <td>{item.deceasedName ?? 'Não informado'}</td>
                        <td>{item.city}</td>
                        <td>{item.address}</td>
                      </tr>
                    ))}
                    {!queue.data.content.length && (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          Nenhuma solicitação encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {queue.data.totalPages > 1 && (
                <Pagination
                  sx={{ p: 2 }}
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
        </section>
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
                  <section
                    className="actions-section"
                    aria-label="Ações da solicitação selecionada"
                  >
                    <div className="actions-heading">
                      <h2>Ações da solicitação selecionada</h2>
                      <span>{request.protocolNumber}</span>
                    </div>
                    <div className="action-scope surface">
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
                    </div>
                  </section>
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
            <p>{request?.protocolNumber} — A decisão será registrada no servidor.</p>
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
        <Snackbar
          open={Boolean(notice)}
          autoHideDuration={7000}
          onClose={() => setNotice(undefined)}
        >
          <Alert severity={notice?.severity} onClose={() => setNotice(undefined)}>
            {notice?.text}
          </Alert>
        </Snackbar>
      </section>
    </div>
  );
}
