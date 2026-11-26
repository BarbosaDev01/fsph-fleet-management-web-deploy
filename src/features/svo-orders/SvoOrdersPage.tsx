import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccess } from '@/features/auth/access';
import { errorMessage } from '@/shared/api/result';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { PageHeading } from '@/shared/components/PageHeading';
import { dateTime, ordersApi, orderStatuses, type OrderStatus } from './api';
import { OrderStatus as Status } from './OrderSummary';

export function SvoOrdersPage() {
  const { user, can } = useAccess();
  const [params] = useSearchParams();
  const requestId = params.get('requestId') ?? undefined;
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['svo-orders', user?.id, 'list', page, status, term, requestId],
    queryFn: ({ signal }) =>
      ordersApi.list(
        { page, size: 20, status: status || undefined, search: term || undefined, requestId },
        signal,
      ),
    enabled: can('SVO_ORDERS_READ'),
    retry: false,
    refetchInterval: 30000,
  });
  async function generate() {
    if (!requestId || busy) return;
    setBusy(true);
    setError('');
    try {
      const o = await ordersApi.generate(requestId);
      await navigate(`/coletas-svo/${o.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!can('SVO_ORDERS_READ'))
    return <Alert severity="warning">Acesso restrito às coletas SVO.</Alert>;
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeading
        title="Coletas SVO"
        description={
          ['MOTORISTA', 'EQUIPE_COLETA_SVO'].includes(user?.role ?? '')
            ? 'Consulte suas ordens e registre o atendimento em campo.'
            : 'Acompanhe as ordens do setor, seus prazos e o histórico de atendimento.'
        }
        action={
          <Button disabled={busy} onClick={() => void query.refetch()}>
            Atualizar
          </Button>
        }
      />
      {can('SVO_ORDERS_REPORT') && (
        <Button component={Link} to="/indicadores-svo" sx={{ alignSelf: 'flex-start' }}>
          Indicadores SVO
        </Button>
      )}
      {requestId && (
        <Alert
          severity="info"
          action={
            <Button component={Link} to="/coletas-svo">
              Ver todas
            </Button>
          }
        >
          Coletas vinculadas à solicitação selecionada na triagem.
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack
          component="form"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setTerm(search.trim());
          }}
        >
          <TextField
            label="Buscar protocolo ou endereço"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 0 }}
          />
          <TextField
            select
            label="Situação"
            size="small"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus | '');
              setPage(0);
            }}
            sx={{ minWidth: { sm: 220 } }}
          >
            <MenuItem value="">Todas</MenuItem>
            {Object.entries(orderStatuses).map(([s, label]) => (
              <MenuItem key={s} value={s}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained">
            Buscar
          </Button>
        </Stack>
      </Paper>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ApiFeedback error={query.error} retry={() => void query.refetch()} />
      ) : query.data.content.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography>Nenhuma ordem encontrada.</Typography>
            {requestId && can('SVO_REQUESTS_MANAGE') && (
              <Button variant="contained" disabled={busy} onClick={() => void generate()}>
                {busy ? 'Gerando…' : 'Gerar ordem da triagem aprovada'}
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'repeat(2,minmax(0,1fr))' },
              gap: 2,
            }}
          >
            {query.data.content.map((o) => (
              <Paper key={o.id} component="article" variant="outlined" sx={{ p: 2.5, minWidth: 0 }}>
                <Stack spacing={1.5}>
                  <Typography component="h2" variant="h3">
                    {o.protocolNumber}
                  </Typography>
                  <Status order={o} />
                  <Typography sx={{ overflowWrap: 'anywhere' }}>
                    {o.address}, {o.city}
                  </Typography>
                  <Typography variant="body2">Agendamento: {dateTime(o.scheduledAt)}</Typography>
                  <Typography variant="body2">
                    {o.vehiclePlate ?? 'Veículo a atribuir'} ·{' '}
                    {o.driverName ?? 'Motorista a atribuir'} · {o.teamName ?? 'Sem equipe'}
                  </Typography>
                  <Button
                    component={Link}
                    to={`/coletas-svo/${o.id}`}
                    variant="outlined"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Abrir ordem {o.protocolNumber}
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Box>
          {query.data.totalPages > 1 && (
            <Pagination
              count={query.data.totalPages}
              page={page + 1}
              onChange={(_, p) => setPage(p - 1)}
              aria-label="Páginas de coletas"
            />
          )}
        </>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
