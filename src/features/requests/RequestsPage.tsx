import { useState } from 'react';
import { Alert, Button, Chip, MenuItem, Stack, TextField } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAccess } from '@/features/auth/access';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { DataTable } from '@/shared/components/DataTable';
import { FormDialog } from '@/shared/components/FormDialog';
import { PageHeading } from '@/shared/components/PageHeading';
import { invalidateData } from '@/shared/api/invalidate';
import { dateTime } from '@/shared/format';
import { tripRequestsApi, requestStatusLabels, type RequestStatus } from './api';
import { requestBody, requestFields } from './form';

export function RequestsPage({ management = false }: { management?: boolean }) {
  const { can } = useAccess();
  const client = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const creating = pathname.endsWith('/nova');
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [search, setSearch] = useState('');
  const mine = !can('TRIP_REQUESTS_READ');
  const query = useQuery({
    queryKey: ['requests', mine, status],
    queryFn: ({ signal }) => tripRequestsApi.list(mine, status || undefined, signal),
  });
  const text = search.trim().toLocaleLowerCase('pt-BR');
  const rows = (query.data ?? []).filter((row) =>
    `${row.origin} ${row.destination} ${row.purpose} ${row.requesterName ?? ''} ${row.requesterSectorName ?? ''}`
      .toLocaleLowerCase('pt-BR')
      .includes(text),
  );
  return (
    <Stack spacing={3}>
      <PageHeading
        title={management ? 'Atendimento e agendamento' : 'Solicitações de viagem'}
        description={
          mine
            ? 'Acompanhe suas solicitações e os retornos da equipe responsável.'
            : 'Consulte as demandas de viagem autorizadas para sua conta.'
        }
        action={
          can('TRIP_REQUESTS_WRITE') && (
            <Button component={Link} to="/solicitacoes/nova" variant="contained">
              Nova solicitação
            </Button>
          )
        }
      />
      {management && (
        <Alert severity="info">
          Aprovação, rejeição e agendamento de viagens. A triagem específica do SVO com análise e
          complemento permanece um protótipo pendente.
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Buscar solicitação"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Situação"
          select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(requestStatusLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <ApiFeedback
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending ? (
        <Loading />
      ) : (
        !query.error && (
          <DataTable
            rows={rows}
            columns={[
              {
                label: 'Solicitante / setor',
                render: (row) =>
                  `${row.requesterName ?? '—'} · ${row.requesterSectorName ?? 'Sem setor'}`,
              },
              { label: 'Origem', render: (row) => row.origin },
              { label: 'Destino', render: (row) => row.destination },
              { label: 'Saída', render: (row) => dateTime(row.departureAt) },
              { label: 'Retorno', render: (row) => dateTime(row.expectedReturnAt) },
              { label: 'Passageiros', render: (row) => row.passengerCount },
              {
                label: 'Situação',
                render: (row) => <Chip size="small" label={requestStatusLabels[row.status]} />,
              },
            ]}
            actions={(row) => (
              <Button component={Link} to={`/solicitacoes/${row.id}`} size="small">
                Ver solicitação
              </Button>
            )}
          />
        )
      )}
      {creating &&
        (can('TRIP_REQUESTS_WRITE') ? (
          <FormDialog
            title="Nova solicitação de viagem"
            fields={requestFields}
            onClose={() => {
              void navigate('/solicitacoes', { replace: true });
            }}
            onSubmit={async (values) => {
              await tripRequestsApi.create(requestBody(values));
              await invalidateData(client);
            }}
          />
        ) : (
          <Alert severity="warning">Sua conta não tem permissão para criar solicitações.</Alert>
        ))}
    </Stack>
  );
}
