import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
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
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccess } from '@/features/auth/access';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { PageHeading } from '@/shared/components/PageHeading';
import { SummaryCard } from '@/shared/components/SummaryCard';
import { ordersApi, minutes, dateTime, type OrderFilters } from './api';
import { OrderStatus } from './OrderSummary';

export function SvoOrderReportPage() {
  const { user, can } = useAccess();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [teamId, setTeam] = useState('');
  const [vehicleId, setVehicle] = useState('');
  const [filters, setFilters] = useState<OrderFilters>({});
  const [validation, setValidation] = useState('');
  const baseline = useQuery({
    queryKey: ['svo-report', user?.id, 'options'],
    queryFn: ({ signal }) => ordersApi.report({}, signal),
    enabled: can('SVO_ORDERS_REPORT'),
    retry: false,
  });
  const query = useQuery({
    queryKey: ['svo-report', user?.id, 'filtered', filters],
    queryFn: ({ signal }) => ordersApi.report(filters, signal),
    enabled: can('SVO_ORDERS_REPORT'),
    retry: false,
  });
  const teams = [
    ...new Map(
      (baseline.data?.orders ?? []).filter((o) => o.teamId).map((o) => [o.teamId!, o.teamName!]),
    ).entries(),
  ];
  const vehicles = [
    ...new Map(
      (baseline.data?.orders ?? [])
        .filter((o) => o.vehicleId)
        .map((o) => [o.vehicleId!, o.vehiclePlate!]),
    ).entries(),
  ];
  if (!can('SVO_ORDERS_REPORT'))
    return <Alert severity="warning">Acesso restrito aos indicadores SVO.</Alert>;
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <PageHeading
        title="Indicadores SVO"
        description="Tempos reais das ordens, por período de entrada da solicitação."
        action={
          <Button
            onClick={() => {
              void query.refetch();
              void baseline.refetch();
            }}
          >
            Atualizar
          </Button>
        }
      />
      <Button component={Link} to="/coletas-svo" sx={{ alignSelf: 'flex-start' }}>
        Abrir coletas SVO
      </Button>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to && from > to) {
              setValidation('A data final deve ser igual ou posterior à inicial.');
              return;
            }
            setValidation('');
            const end = to ? new Date(`${to}T00:00:00`) : undefined;
            end?.setDate(end.getDate() + 1);
            setFilters({
              from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
              to: end?.toISOString(),
              teamId: teamId || undefined,
              vehicleId: vehicleId || undefined,
            });
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Solicitações desde"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Solicitações até"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label="Equipe"
              value={teamId}
              onChange={(e) => setTeam(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {teams.map(([id, name]) => (
                <MenuItem key={id} value={id}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Veículo"
              value={vehicleId}
              onChange={(e) => setVehicle(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {vehicles.map(([id, name]) => (
                <MenuItem key={id} value={id}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="contained">
              Filtrar indicadores
            </Button>
          </Stack>
          {validation && <Alert severity="error">{validation}</Alert>}
        </Stack>
      </Paper>
      <ApiFeedback error={baseline.error} retry={() => void baseline.refetch()} />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ApiFeedback error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Box
            component="section"
            aria-label="Médias por etapa"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(3,minmax(0,1fr))' },
              gap: 2,
            }}
          >
            <SummaryCard
              title={`Solicitação até coleta · ${query.data.collectionCount} ${query.data.collectionCount === 1 ? 'ordem' : 'ordens'}`}
              value={minutes(query.data.averageRequestToCollectionMinutes)}
              compact
            />
            <SummaryCard
              title={`Coleta até entrega · ${query.data.deliveryCount} ${query.data.deliveryCount === 1 ? 'ordem' : 'ordens'}`}
              value={minutes(query.data.averageCollectionToDeliveryMinutes)}
              compact
            />
            <SummaryCard
              title={`Solicitação até entrega · ${query.data.deliveryCount} ${query.data.deliveryCount === 1 ? 'ordem' : 'ordens'}`}
              value={minutes(query.data.averageRequestToDeliveryMinutes)}
              compact
            />
          </Box>
          <Alert severity="info">
            Coletas em andamento entram na média até a coleta. Os tempos de entrega entram somente
            após a entrega. Ordens sem prazo registrado aparecem como sem prazo definido.
          </Alert>
          <Paper variant="outlined" sx={{ minWidth: 0 }}>
            <Typography component="h2" variant="h3" sx={{ p: 2.5 }}>
              Ordens que compõem o resultado ({query.data.totalOrders})
            </Typography>
            <TableContainer role="region" aria-label="Tempos das ordens" tabIndex={0}>
              <Table size="small" sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow>
                    {[
                      'Ordem',
                      'Situação e prazo',
                      'Solicitada',
                      'Coletada',
                      'Entregue',
                      'Solicitação → coleta',
                      'Coleta → entrega',
                      'Total',
                    ].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {query.data.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Button component={Link} to={`/coletas-svo/${o.id}`}>
                          {o.protocolNumber}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <OrderStatus order={o} />
                      </TableCell>
                      <TableCell>{dateTime(o.requestedAt)}</TableCell>
                      <TableCell>{dateTime(o.collectedAt)}</TableCell>
                      <TableCell>{dateTime(o.deliveredAt)}</TableCell>
                      <TableCell>{minutes(o.requestToCollectionMinutes)}</TableCell>
                      <TableCell>{minutes(o.collectionToDeliveryMinutes)}</TableCell>
                      <TableCell>{minutes(o.requestToDeliveryMinutes)}</TableCell>
                    </TableRow>
                  ))}
                  {!query.data.orders.length && (
                    <TableRow>
                      <TableCell colSpan={8}>Nenhuma ordem encontrada neste período.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Stack>
  );
}
