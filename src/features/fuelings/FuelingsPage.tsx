import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageHeading } from '@/shared/components/PageHeading';
import { SummaryCard } from '@/shared/components/SummaryCard';
import { DataTable, type Column } from '@/shared/components/DataTable';
import { ApiFeedback } from '@/shared/components/ApiFeedback';
import { localDate } from '@/shared/format';
import {
  format,
  fuelingKeys,
  fuelingsApi,
  fuelTypes,
  type Fueling,
  type FuelType,
} from './fuelings.api';
import { useFuelingAccess } from './useFuelingAccess';

const PAGE_SIZE = 20;
const emptyFilters = {
  search: '',
  vehicleId: '',
  stationId: '',
  fuelType: '' as FuelType | '',
  from: '',
  to: '',
  outOfPatternOnly: false,
};
type Filters = typeof emptyFilters;

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[̀-ͯ\s-]/g, '');

function applyFilters(rows: Fueling[], filters: Filters) {
  const search = normalize(filters.search);
  return rows
    .filter(
      (row) =>
        (!search ||
          normalize(`${row.vehiclePlate}${row.vehicleModel}${row.stationName}`).includes(search)) &&
        (!filters.vehicleId || row.vehicleId === filters.vehicleId) &&
        (!filters.stationId || row.stationId === filters.stationId) &&
        (!filters.fuelType || row.fuelType === filters.fuelType) &&
        (!filters.from || row.fueledOn >= filters.from) &&
        (!filters.to || row.fueledOn <= filters.to) &&
        (!filters.outOfPatternOnly || row.outOfPattern),
    )
    .sort(
      (a, b) =>
        b.fueledOn.localeCompare(a.fueledOn) ||
        (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
    );
}

const columns: Column<Fueling>[] = [
  { label: 'Data', render: (row) => localDate(row.fueledOn) },
  {
    label: 'Veículo',
    render: (row) => (
      <>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.vehiclePlate}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.vehicleModel}
        </Typography>
      </>
    ),
  },
  { label: 'Posto', render: (row) => row.stationName },
  { label: 'Combustível', render: (row) => fuelTypes[row.fuelType] },
  { label: 'Litros', render: (row) => format.liters(row.liters) },
  {
    label: 'Valor',
    render: (row) => (
      <>
        <Typography variant="body2">{format.money(row.totalValue)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {format.money(row.pricePerLiter)}/L
        </Typography>
      </>
    ),
  },
  {
    label: 'Hodômetro',
    render: (row) => (
      <>
        <Typography variant="body2">{format.km(row.odometerKm)}</Typography>
        {row.distanceDrivenKm != null && (
          <Typography variant="caption" color="text.secondary">
            +{format.km(row.distanceDrivenKm)} rodados
          </Typography>
        )}
      </>
    ),
  },
  {
    label: 'Consumo',
    render: (row) =>
      row.consumptionKmPerLiter != null ? (
        <>
          <Typography variant="body2">{format.kmPerLiter(row.consumptionKmPerLiter)}</Typography>
          {row.referenceAverageKmPerLiter != null && (
            <Typography variant="caption" color="text.secondary">
              Média {format.kmPerLiter(row.referenceAverageKmPerLiter)}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Primeiro registro
        </Typography>
      ),
  },
  {
    label: 'Situação',
    render: (row) =>
      row.outOfPattern ? (
        <Tooltip title={row.anomalyReason ?? 'Consumo fora do padrão do veículo.'}>
          <Chip size="small" color="warning" label="Fora do padrão" tabIndex={0} />
        </Tooltip>
      ) : (
        <Chip size="small" variant="outlined" label="Normal" />
      ),
  },
  { label: 'Registrado por', render: (row) => row.registeredByName ?? '—' },
];

export function FuelingsPage() {
  const { scope, canRegister } = useFuelingAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const created = (location.state as { created?: Fueling } | null)?.created;
  const query = useQuery({
    queryKey: fuelingKeys.list(scope),
    queryFn: () => fuelingsApi.list(scope),
  });
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => applyFilters(rows, draft), [rows, draft]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const vehicles = uniqueOptions(rows, (row) => [
    row.vehicleId,
    `${row.vehiclePlate} · ${row.vehicleModel}`,
  ]);
  const stations = uniqueOptions(rows, (row) => [row.stationId, row.stationName]);
  const hasFilters = JSON.stringify(draft) !== JSON.stringify(emptyFilters);
  const totals = filtered.reduce(
    (sum, row) => ({
      liters: sum.liters + row.liters,
      value: sum.value + row.totalValue,
      anomalies: sum.anomalies + (row.outOfPattern ? 1 : 0),
    }),
    { liters: 0, value: 0, anomalies: 0 },
  );

  function update<K extends keyof Filters>(name: K, value: Filters[K]) {
    setDraft((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Stack spacing={3}>
        <PageHeading
          title="Histórico de abastecimentos"
          description={
            scope === 'all'
              ? 'Consulte os abastecimentos da frota, o consumo calculado e os alertas fora do padrão.'
              : 'Consulte os abastecimentos que você registrou.'
          }
          action={
            canRegister ? (
              <Button
                component={Link}
                to="/abastecimentos/novo"
                variant="contained"
                sx={{ whiteSpace: 'nowrap' }}
              >
                <Box component="span" aria-hidden="true" sx={{ mr: 1 }}>
                  +
                </Box>
                Registrar abastecimento
              </Button>
            ) : undefined
          }
        />
        {created && (
          <Alert
            severity={created.outOfPattern ? 'warning' : 'success'}
            onClose={() => navigate(location.pathname, { replace: true, state: null })}
            closeText="Fechar mensagem"
          >
            Abastecimento de {created.vehiclePlate} em {localDate(created.fueledOn)} registrado.
            {created.outOfPattern &&
              ` Atenção: consumo fora do padrão${created.anomalyReason ? ` (${created.anomalyReason})` : ''}.`}
          </Alert>
        )}
        {query.isPending && (
          <Paper variant="outlined" role="status" sx={{ p: 4 }}>
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <CircularProgress aria-label="Carregando abastecimentos" />
              <Typography>Carregando abastecimentos. Aguarde um momento.</Typography>
            </Stack>
          </Paper>
        )}
        {query.isError && <ApiFeedback error={query.error} retry={() => void query.refetch()} />}
        {query.isSuccess && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <SummaryCard
                title="Abastecimentos"
                value={String(filtered.length)}
                description={hasFilters ? 'Conforme os filtros' : 'Total registrado'}
              />
              <SummaryCard title="Litros" value={format.liters(totals.liters)} compact />
              <SummaryCard title="Valor total" value={format.money(totals.value)} compact />
              <SummaryCard
                title="Fora do padrão"
                value={String(totals.anomalies)}
                description="Consumo divergente da média do veículo"
              />
            </Box>
            <Paper
              component="section"
              aria-label="Pesquisa e filtros"
              variant="outlined"
              sx={{ p: 2.5 }}
            >
              <Stack spacing={2}>
                <Typography component="h2" variant="h3" sx={{ fontWeight: 700 }}>
                  Encontre um abastecimento
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Pesquisar placa, modelo ou posto"
                    value={draft.search}
                    onChange={(event) => update('search', event.target.value)}
                    size="small"
                  />
                  <TextField
                    select
                    label="Veículo"
                    value={draft.vehicleId}
                    onChange={(event) => update('vehicleId', event.target.value)}
                    size="small"
                  >
                    <MenuItem value="">Todos os veículos</MenuItem>
                    {vehicles.map(([id, label]) => (
                      <MenuItem key={id} value={id}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Posto"
                    value={draft.stationId}
                    onChange={(event) => update('stationId', event.target.value)}
                    size="small"
                  >
                    <MenuItem value="">Todos os postos</MenuItem>
                    {stations.map(([id, label]) => (
                      <MenuItem key={id} value={id}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Combustível"
                    value={draft.fuelType}
                    onChange={(event) => update('fuelType', event.target.value as FuelType | '')}
                    size="small"
                  >
                    <MenuItem value="">Todos os combustíveis</MenuItem>
                    {Object.entries(fuelTypes).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="De"
                    type="date"
                    value={draft.from}
                    onChange={(event) => update('from', event.target.value)}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Até"
                    type="date"
                    value={draft.to}
                    onChange={(event) => update('to', event.target.value)}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: { sm: 'center' },
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={draft.outOfPatternOnly}
                        onChange={(event) => update('outOfPatternOnly', event.target.checked)}
                      />
                    }
                    label="Somente fora do padrão"
                  />
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" aria-live="polite">
                      {filtered.length} de {rows.length} abastecimentos
                    </Typography>
                    <Button
                      onClick={() => {
                        setDraft(emptyFilters);
                        setPage(1);
                      }}
                      disabled={!hasFilters}
                    >
                      Limpar filtros
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
            {rows.length === 0 ? (
              <Paper
                variant="outlined"
                role="status"
                sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}
              >
                <Typography component="h2" variant="h3">
                  Nenhum abastecimento registrado
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Quando houver abastecimentos registrados, eles aparecerão aqui.
                </Typography>
              </Paper>
            ) : (
              <DataTable rows={visible} columns={columns} />
            )}
            {pageCount > 1 && (
              <Pagination
                aria-label="Páginas de abastecimentos"
                count={pageCount}
                page={page}
                onChange={(_, value) => setPage(value)}
              />
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}

function uniqueOptions(rows: Fueling[], pick: (row: Fueling) => [string, string]) {
  return [...new Map(rows.map(pick)).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
}
