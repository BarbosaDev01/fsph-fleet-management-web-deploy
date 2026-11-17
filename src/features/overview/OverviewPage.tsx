import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAccess } from '@/features/auth/access';
import { driversApi, vehiclesApi } from '@/features/registry/api';
import { tripRequestsApi } from '@/features/requests/api';
import type { Permission } from '@/shared/api/types';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { PageHeading } from '@/shared/components/PageHeading';

function Metric({
  title,
  permission,
  load,
  to,
  description,
}: {
  title: string;
  permission: Permission;
  load: (signal: AbortSignal) => Promise<number>;
  to: string;
  description: string;
}) {
  const { can } = useAccess();
  const allowed = can(permission);
  const query = useQuery({
    queryKey: ['overview', title],
    queryFn: ({ signal }) => load(signal),
    enabled: allowed,
  });
  return (
    <Paper variant="outlined" sx={{ p: 3, flex: '1 1 220px', minWidth: 0 }}>
      <Stack spacing={2}>
        <Typography component="h2" variant="h6">
          {title}
        </Typography>
        {!allowed ? (
          <Typography color="text.secondary">Consulta não autorizada para sua conta.</Typography>
        ) : query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ApiFeedback
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <Typography variant="h3" component="p" color="primary">
            {query.data}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {allowed && (
          <Button component={Link} to={to} sx={{ alignSelf: 'flex-start' }}>
            Consultar registros
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

const countVehicles = async (signal: AbortSignal) =>
  (await vehiclesApi.list(signal)).filter((row) => row.active).length;
const countDrivers = async (signal: AbortSignal) =>
  (await driversApi.list(signal)).filter((row) => row.active && row.userActive).length;
const countPending = async (signal: AbortSignal) =>
  (await tripRequestsApi.list(false, 'PENDING', signal)).length;
const countScheduled = async (signal: AbortSignal) =>
  (await tripRequestsApi.list(false, 'SCHEDULED', signal)).length;

export function OverviewPage() {
  return (
    <Stack spacing={3}>
      <PageHeading
        title="Painel da frota"
        description="Indicadores da frota disponíveis para sua conta."
      />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
        <Metric
          title="Veículos ativos"
          permission="VEHICLES_READ"
          load={countVehicles}
          to="/veiculos"
          description="Cadastros ativos; esta contagem não representa disponibilidade de alocação."
        />
        <Metric
          title="Motoristas ativos"
          permission="DRIVERS_READ"
          load={countDrivers}
          to="/motoristas"
          description="Motoristas e usuários ativos; a validade da CNH é verificada no agendamento."
        />
        <Metric
          title="Solicitações pendentes"
          permission="TRIP_REQUESTS_READ"
          load={countPending}
          to="/solicitacoes"
          description="Solicitações de viagem que aguardam uma decisão."
        />
        <Metric
          title="Solicitações agendadas"
          permission="TRIP_REQUESTS_READ"
          load={countScheduled}
          to="/atendimento-svo"
          description="Reservas agendadas, incluindo o histórico. Esta contagem não representa viagens em execução."
        />
      </Stack>
      <Alert severity="info">
        Indicadores históricos de consumo, custos e triagem SVO ainda não estão integrados a este
        painel. Nenhum valor demonstrativo é apresentado como indicador institucional.
      </Alert>
    </Stack>
  );
}
