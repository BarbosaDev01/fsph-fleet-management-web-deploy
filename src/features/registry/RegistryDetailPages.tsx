import { Button, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { PageHeading } from '@/shared/components/PageHeading';
import { ActiveChip } from './RegistryScreen';
import { driversApi, vehiclesApi } from './api';

export function VehicleDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['registry', 'vehicle', id],
    queryFn: () => vehiclesApi.find(id),
  });
  const vehicle = query.data;
  return (
    <Stack spacing={3}>
      <Button component={Link} to="/veiculos" sx={{ alignSelf: 'flex-start' }}>
        Voltar aos veículos
      </Button>
      <PageHeading title="Detalhes do veículo" />
      <ApiFeedback
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Loading />}
      {vehicle && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography component="h2" variant="h6">
              {vehicle.plate} · {vehicle.model}
            </Typography>
            <ActiveChip active={vehicle.active} />
            <Typography>
              Capacidade total: {vehicle.capacity} pessoa(s), incluindo o condutor.
            </Typography>
            <Typography>Tipo de uso: {vehicle.usageType}</Typography>
            <Typography>
              Quilometragem: {vehicle.currentOdometerKm.toLocaleString('pt-BR')} km
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }}>
              Setor: {vehicle.sectorId ?? 'Sem setor'}
            </Typography>
            <Button
              component={Link}
              to={`/veiculos/${id}/documentos`}
              sx={{ alignSelf: 'flex-start' }}
            >
              Consultar documentos
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export function DriverDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['registry', 'driver', id],
    queryFn: () => driversApi.find(id),
  });
  const driver = query.data;
  return (
    <Stack spacing={3}>
      <Button component={Link} to="/motoristas" sx={{ alignSelf: 'flex-start' }}>
        Voltar aos motoristas
      </Button>
      <PageHeading title="Detalhes do motorista" />
      <ApiFeedback
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <Loading />}
      {driver && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography component="h2" variant="h6">
              {driver.name}
            </Typography>
            <Typography>{driver.email}</Typography>
            <ActiveChip active={driver.active} />
            <Typography>Usuário vinculado: {driver.userActive ? 'Ativo' : 'Inativo'}</Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }}>
              Identificador do usuário: {driver.userId}
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }}>
              Setor: {driver.sectorId ?? 'Sem setor'}
            </Typography>
            <Typography color="text.secondary">
              O veículo é atribuído em cada operação de viagem.
            </Typography>
            <Button component={Link} to={`/motoristas/${id}/cnhs`} sx={{ alignSelf: 'flex-start' }}>
              Consultar CNHs
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
