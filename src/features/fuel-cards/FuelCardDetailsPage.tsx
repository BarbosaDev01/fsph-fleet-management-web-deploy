import { useFuelCardsPath } from '@/features/fuel-cards/data/useFuelCardsPath';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useFuelCardsData } from '@/features/fuel-cards/data/FuelCardsProvider';
import { PageHeading } from '@/shared/components/PageHeading';
import { FuelCardPreview } from '@/features/fuel-cards/components/FuelCardPreview';
import { useFuelCard } from './data/useFuelCard';

const money = (value?: number) =>
  value == null
    ? 'Não informado'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
type Confirmation = { kind: 'status'; status: string } | { kind: 'unlink' } | null;

export function FuelCardDetailsPage() {
  const { id } = useParams();
  return <CardDetails key={id} id={id} />;
}
function CardDetails({ id }: { id?: string }) {
  const basePath = useFuelCardsPath();
  const data = useFuelCardsData();
  const snapshot = data?.state.status === 'ready' ? data.state : undefined;
  const { card, error, loading } = useFuelCard(id);
  const vehicles = snapshot?.vehicles ?? [];
  const statusOptions = snapshot?.statusOptions ?? [];
  const [vehicleId, setVehicleId] = useState('');
  const [status, setStatus] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const fields = card
    ? [
        ['Número do cartão', card.card ?? 'Não informado'],
        ...(data?.mode === 'api'
          ? [['Titular ou identificador', card.cardholderName ?? 'Não informado']]
          : []),
        ['Veículo vinculado', card.vehicle ?? 'Não informado'],
        ['Limite total', money(card.totalLimit)],
        ['Saldo disponível', money(card.availableBalance)],
        ['Validade', card.validity ?? 'Não informado'],
        ['Status atual', card.status ?? 'Não informado'],
        ...(data?.mode === 'api' ? [['Observações', card.notes ?? 'Não informado']] : []),
        ...(card.sector ? [['Setor do veículo', card.sector]] : []),
      ]
    : [];
  async function confirm() {
    if (!data || !card || !confirmation) return;
    const applied = await (confirmation.kind === 'unlink'
      ? data.unlinkVehicle(card.id)
      : data.changeStatus(card.id, confirmation.status));
    if (applied) {
      setConfirmation(null);
      setStatus('');
      setVehicleId('');
    }
  }
  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Stack spacing={3}>
        <Button component={Link} to={basePath} sx={{ alignSelf: 'flex-start' }}>
          Voltar à listagem
        </Button>
        <PageHeading
          title="Detalhes do cartão"
          description="Dados do cartão, vínculo com a frota e opções de gestão."
          action={
            card && data?.canWrite ? (
              <Button component={Link} to={`${basePath}/${card.id}/editar`} variant="outlined">
                Editar cartão
              </Button>
            ) : undefined
          }
        />
        {loading ? (
          <Alert severity="info" role="status">
            Carregando cartão…
          </Alert>
        ) : error ? (
          <Alert severity="error">
            {error}
            <Button onClick={data?.retry}>Tentar novamente</Button>
          </Alert>
        ) : !card ? (
          <Alert severity="warning">
            {data?.mode === 'demo'
              ? 'Cartão não encontrado nesta demonstração. Volte à listagem para consultar os cartões disponíveis.'
              : 'Cartão não encontrado. Volte à listagem para consultar os cartões disponíveis.'}
          </Alert>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  lg: 'minmax(0, .9fr) minmax(0, 1.1fr)',
                },
                gap: 3,
              }}
            >
              <FuelCardPreview card={card} />
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography component="h2" variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
                  Informações do cartão
                </Typography>
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
                      <Typography component="dt" color="text.secondary" variant="body2">
                        {label}
                      </Typography>
                      <Typography
                        component="dd"
                        sx={{
                          m: 0,
                          mt: 0.5,
                          fontWeight: 600,
                          overflowWrap: 'anywhere',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
            {data?.canWrite && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
                  gap: 3,
                }}
              >
                <Paper
                  component="section"
                  aria-labelledby="vehicle-title"
                  variant="outlined"
                  sx={{ p: 2.5 }}
                >
                  <Stack
                    component="form"
                    spacing={2}
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (vehicleId && (await data?.linkVehicle(card.id, vehicleId)))
                        setVehicleId('');
                    }}
                  >
                    <Typography
                      id="vehicle-title"
                      component="h2"
                      variant="h3"
                      sx={{ fontWeight: 700 }}
                    >
                      Vínculo com veículo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data?.mode === 'demo'
                        ? 'Escolha o veículo que utilizará este cartão. Os veículos abaixo são fictícios.'
                        : 'Selecione um veículo ativo. O servidor valida se ele já possui outro cartão vinculado.'}
                    </Typography>
                    <TextField
                      select
                      label={data?.mode === 'demo' ? 'Veículo demonstrativo' : 'Veículo'}
                      value={vehicleId}
                      onChange={(event) => setVehicleId(event.target.value)}
                    >
                      <MenuItem value="">Selecione um veículo</MenuItem>
                      {vehicles.map((vehicle) => (
                        <MenuItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    {data?.mode === 'api' && !vehicles.length && (
                      <Alert severity="info">
                        Nenhum veículo ativo disponível para seleção. A consulta de veículos exige a
                        permissão VEHICLES_READ.
                      </Alert>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          data?.busy ||
                          !vehicleId ||
                          vehicles.find((vehicle) => vehicle.id === vehicleId)?.label ===
                            card.vehicle
                        }
                      >
                        Vincular veículo
                      </Button>
                      <Button
                        disabled={!card.vehicle || data?.busy}
                        onClick={() => setConfirmation({ kind: 'unlink' })}
                      >
                        Desvincular veículo
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
                <Paper
                  component="section"
                  aria-labelledby="status-title"
                  variant="outlined"
                  sx={{ p: 2.5 }}
                >
                  <Stack
                    component="form"
                    spacing={2}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (status && status !== card.status)
                        setConfirmation({ kind: 'status', status });
                    }}
                  >
                    <Typography
                      id="status-title"
                      component="h2"
                      variant="h3"
                      sx={{ fontWeight: 700 }}
                    >
                      Status do cartão
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data?.mode === 'demo'
                        ? 'Alterações apenas demonstrativas. Opções e transições definitivas dependem de confirmação.'
                        : 'O status exibido será atualizado após a confirmação do servidor.'}
                    </Typography>
                    <TextField
                      select
                      label={data?.mode === 'demo' ? 'Novo status demonstrativo' : 'Novo status'}
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                    >
                      <MenuItem value="">Selecione um status</MenuItem>
                      {statusOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        type="submit"
                        variant="outlined"
                        disabled={data?.busy || !status || status === card.status}
                      >
                        Revisar alteração de status
                      </Button>
                      <Button
                        color="error"
                        disabled={
                          data?.busy ||
                          card.status === 'Cancelado' ||
                          !statusOptions.includes('Cancelado')
                        }
                        onClick={() => setConfirmation({ kind: 'status', status: 'Cancelado' })}
                      >
                        Cancelar cartão
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Box>
            )}
            <Dialog
              open={Boolean(confirmation)}
              onClose={() => setConfirmation(null)}
              aria-labelledby="confirm-status-title"
              aria-describedby="confirm-status-description"
              fullWidth
              maxWidth="xs"
            >
              <DialogTitle id="confirm-status-title">
                {confirmation?.kind === 'unlink'
                  ? 'Desvincular veículo?'
                  : data?.mode === 'demo'
                    ? 'Confirmar alteração demonstrativa?'
                    : 'Confirmar alteração?'}
              </DialogTitle>
              <DialogContent>
                <DialogContentText id="confirm-status-description">
                  {confirmation?.kind === 'unlink'
                    ? `O veículo ${card.vehicle} será desvinculado do cartão ${card.card}.`
                    : `O cartão ${card.card} passará de ${card.status ?? 'Não informado'} para ${confirmation?.status ?? ''}.`}{' '}
                  {data?.mode === 'demo'
                    ? 'A alteração ocorre apenas nesta demonstração, sem envio ao servidor.'
                    : 'A alteração será gravada na API. Desvincular remove somente a associação com o veículo.'}
                </DialogContentText>
              </DialogContent>
              <DialogActions
                sx={{ flexWrap: 'wrap', gap: 1, p: 2, '& .MuiButton-root': { minHeight: 44 } }}
              >
                <Button autoFocus disabled={data?.busy} onClick={() => setConfirmation(null)}>
                  Cancelar alteração
                </Button>
                <Button
                  variant="contained"
                  color={
                    confirmation?.kind === 'status' && confirmation.status === 'Cancelado'
                      ? 'error'
                      : 'primary'
                  }
                  onClick={confirm}
                  disabled={data?.busy}
                >
                  Confirmar alteração
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Stack>
    </Box>
  );
}
