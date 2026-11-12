import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
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
import { authToken } from '@/shared/api/auth-token';
import { loadDemoDashboard } from './mocks/dashboard';
import type { DashboardData } from './dashboard.types';
import './dashboard.css';

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Fortaleza',
});
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Fortaleza',
});
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Fortaleza',
});
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const modules = ['Solicitações', 'Rotas', 'Ordens', 'Veículos', 'Condutores', 'Manutenções'];

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Paper component="section" variant="outlined" className="dashboard-card">
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}
      >
        <Typography component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

export function DashboardPage({ demo = false }: { demo?: boolean }) {
  // Token presence preserves the existing client boundary; the backend must validate real sessions.
  if (!demo && !authToken.get()) return <Navigate to="/login" replace />;
  return <DashboardContent />;
}

function DashboardContent() {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<{ title: string; description: string } | null>(null);
  const dashboard = useQuery({
    queryKey: ['dashboard', 'demo'],
    queryFn: loadDemoDashboard,
    retry: false,
  });
  function leave() {
    authToken.clear();
    navigate('/login', { replace: true });
  }
  return (
    <Box className="fleet-dashboard">
      <Box component="aside" className="dashboard-sidebar">
        <Typography sx={{ fontSize: 28, fontWeight: 800, px: 1, mb: 2 }}>SVO</Typography>
        <Box component="nav" aria-label="Menu principal" className="dashboard-nav">
          <Button component={RouterLink} to="/dashboard/demo" aria-current="page">
            ▦ Dashboard
          </Button>
          {modules.map((title) => (
            <Button
              key={title}
              onClick={() =>
                setDetail({
                  title,
                  description:
                    'Esta funcionalidade ainda não está implementada neste projeto. Nenhuma operação foi executada.',
                })
              }
            >
              {title}
            </Button>
          ))}
          <Button component={RouterLink} to="/usuarios">
            Usuários
          </Button>
        </Box>
        <Box className="dashboard-sidebar-user">
          <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>AC</Avatar>
          <Typography sx={{ fontWeight: 600 }}>Ana Coordenadora</Typography>
          <Typography variant="body2" sx={{ my: 1, color: '#cbd5e1' }}>
            Perfil fictício • Gestora
            <br />
            Administrativo + SVO
          </Typography>
          <Button onClick={leave} sx={{ color: 'white' }}>
            Sair
          </Button>
        </Box>
      </Box>
      <Box component="main" sx={{ minWidth: 0 }}>
        <Box component="header" className="dashboard-header">
          <Breadcrumbs sx={{ fontSize: 14 }}>
            <Link component={RouterLink} to="/">
              SVO
            </Link>
            <Typography variant="body2">Frota administrativa</Typography>
            <Typography variant="body2">Dashboard</Typography>
          </Breadcrumbs>
          <Typography component="h1" sx={{ fontSize: { xs: 26, md: 30 }, fontWeight: 700, mt: 1 }}>
            Visão geral da frota
          </Typography>
          {dashboard.data && (
            <Typography variant="body2" color="text.secondary">
              Período: {dashboard.data.period} • Atualização dos dados fictícios:{' '}
              {dateFormat.format(new Date(dashboard.data.updatedAt))}
            </Typography>
          )}
          <Stack
            direction="row"
            sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 3, mb: 2 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>AC</Avatar>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>Ana Coordenadora</Typography>
                <Typography variant="body2" color="text.secondary">
                  Perfil demonstrativo / Gestora
                </Typography>
              </Box>
            </Stack>
            <Chip variant="outlined" label="Âmbito fictício: Administrativo + SVO" />
            <Button onClick={leave}>Sair</Button>
          </Stack>
        </Box>
        <Stack className="dashboard-body" spacing={2.5}>
          <Alert severity="info">
            Modo demonstrativo: dados históricos fictícios da referência (outubro de 2026). A API do
            dashboard ainda não está integrada. Este perfil não representa permissões autenticadas.
          </Alert>
          {dashboard.isPending ? (
            <Stack role="status" sx={{ alignItems: 'center', p: 6 }} spacing={2}>
              <CircularProgress />
              <Typography>Carregando dashboard…</Typography>
            </Stack>
          ) : dashboard.isError && !dashboard.data ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" onClick={() => void dashboard.refetch()}>
                  Tentar novamente
                </Button>
              }
            >
              Não foi possível carregar o dashboard.
            </Alert>
          ) : (
            <>
              {dashboard.isRefetchError && (
                <Alert severity="warning">
                  Falha ao atualizar. Os dados anteriores foram mantidos. Tente atualizar novamente.
                </Alert>
              )}
              <Box sx={{ alignSelf: 'flex-end' }}>
                <Button
                  variant="outlined"
                  disabled={dashboard.isFetching}
                  onClick={() => void dashboard.refetch()}
                >
                  {dashboard.isFetching ? 'Atualizando…' : 'Atualizar dados'}
                </Button>
              </Box>
              <DashboardSections data={dashboard.data} onDetail={setDetail} />
            </>
          )}
        </Stack>
      </Box>
      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="dashboard-detail-title"
      >
        <DialogTitle id="dashboard-detail-title">{detail?.title}</DialogTitle>
        <DialogContent>
          <Typography>{detail?.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DashboardSections({
  data,
  onDetail,
}: {
  data: DashboardData;
  onDetail: (detail: { title: string; description: string }) => void;
}) {
  const [sector, setSector] = useState('all');
  const [period, setPeriod] = useState('all');
  const clearFilters = () => {
    setSector('all');
    setPeriod('all');
  };
  const routes = data.routes.filter(
    (route) =>
      (sector === 'all' || route.sector === sector) &&
      (period === 'all' ||
        dayFormat.format(new Date(route.startsAt)) === dayFormat.format(new Date())),
  );
  const total = Object.values(data.fleet).reduce((sum, value) => sum + value, 0);
  const peak = Math.max(1, ...data.dailyRequests.map((day) => day.count));
  const kpis = [
    {
      label: 'Disponíveis',
      value: data.fleet.available,
      hint: `${total ? Math.round((data.fleet.available / total) * 100) : 0}% da frota`,
      color: 'primary.main',
    },
    {
      label: 'Em rota',
      value: data.fleet.inRoute,
      hint: `${data.fleet.inRoute} em execução`,
      color: 'success.main',
    },
    {
      label: 'Em manutenção',
      value: data.fleet.maintenance,
      hint: `${data.fleet.maintenance} veículo(s)`,
      color: 'warning.main',
    },
    {
      label: 'Indisponíveis',
      value: data.fleet.unavailable,
      hint: `${data.fleet.unavailable} veículo(s)`,
      color: 'error.main',
    },
  ];
  return (
    <>
      <Box component="section" aria-label="Indicadores da frota" className="dashboard-kpis">
        {kpis.map((kpi) => (
          <Paper key={kpi.label} variant="outlined" className="dashboard-card">
            <Typography variant="body2" sx={{ color: kpi.color }}>
              ▦ {kpi.hint}
            </Typography>
            <Typography sx={{ fontSize: 30, fontWeight: 700, my: 0.5 }}>{kpi.value}</Typography>
            <Typography variant="body2">{kpi.label}</Typography>
          </Paper>
        ))}
      </Box>
      <Box className="dashboard-summary">
        <Card title="Triagem e alocação">
          <Box className="dashboard-stats">
            {[
              ['Triagens pendentes', data.triage.pending],
              ['Aloc. pendentes', data.triage.allocation],
              ['Solicitações / dia', data.triage.requestsToday],
              ['Rotas ativas', data.routes.length],
            ].map(([label, value]) => (
              <Box key={label} className="dashboard-stat">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </Card>
        <Card title="Solicitações / dia">
          {data.dailyRequests.length === 0 ? (
            <Typography role="status">Sem histórico de solicitações.</Typography>
          ) : (
            <Box component="figure" sx={{ m: 0 }}>
              <Box
                className="dashboard-chart"
                role="img"
                aria-label={data.dailyRequests
                  .map((day) => `${day.date}: ${day.count} solicitações`)
                  .join('; ')}
              >
                {data.dailyRequests.map((day) => (
                  <Box key={day.date} className="dashboard-chart-column">
                    <Typography variant="caption">{day.count}</Typography>
                    <Box
                      sx={{
                        height: `${(day.count / peak) * 100}px`,
                        minHeight: 2,
                        bgcolor: day.count === peak ? 'primary.main' : '#dbe8fd',
                        width: '65%',
                        maxWidth: 28,
                        borderRadius: '3px 3px 0 0',
                      }}
                    />
                    <Typography variant="caption">{day.date}</Typography>
                  </Box>
                ))}
              </Box>
              <Typography
                component="figcaption"
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Série histórica demonstrativa: {data.period}.
              </Typography>
            </Box>
          )}
        </Card>
      </Box>
      <Card
        title="Rotas ativas"
        action={
          <Typography variant="body2" color="text.secondary">
            Execução, ocupação e status
          </Typography>
        }
      >
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <TextField
            select
            label="Filtrar por setor"
            size="small"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            sx={{ minWidth: 210 }}
          >
            <MenuItem value="all">Todos os setores</MenuItem>
            {[...new Set(data.routes.map((route) => route.sector))].map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Filtrar por período"
            size="small"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            sx={{ minWidth: 210 }}
          >
            <MenuItem value="all">Todo o período da referência</MenuItem>
            <MenuItem value="today">Hoje (data atual)</MenuItem>
          </TextField>
          {(sector !== 'all' || period !== 'all') && (
            <Button onClick={clearFilters}>Limpar filtros</Button>
          )}
        </Stack>
        <TableContainer
          tabIndex={0}
          role="region"
          aria-label="Rotas ativas: tabela com rolagem horizontal"
        >
          <Table size="small" aria-label="Rotas ativas" sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                {[
                  'Protocolo',
                  'Setor',
                  'Origem',
                  'Destino',
                  'Motorista',
                  'Veículo',
                  'Horário',
                  'Status',
                  'Ocupação',
                ].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{route.id}</TableCell>
                  <TableCell>{route.sector}</TableCell>
                  <TableCell>{route.origin}</TableCell>
                  <TableCell>{route.destination}</TableCell>
                  <TableCell>{route.driver}</TableCell>
                  <TableCell>{route.vehicle}</TableCell>
                  <TableCell>{timeFormat.format(new Date(route.startsAt))}</TableCell>
                  <TableCell>
                    <Chip size="small" color="success" label="Em execução" />
                  </TableCell>
                  <TableCell>
                    {route.occupied}/{route.capacity}
                    {route.occupied >= route.capacity ? ' Lotado' : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {routes.length === 0 && (
          <Typography role="status" sx={{ p: 3, textAlign: 'center' }}>
            {data.routes.length === 0
              ? 'Nenhuma rota ativa cadastrada.'
              : 'Nenhum resultado para os filtros selecionados.'}
          </Typography>
        )}
      </Card>
      <Box className="dashboard-bottom">
        <Card title="Abastecimento" action={<Typography variant="body2">R$ / L</Typography>}>
          {data.refueling.length === 0 ? (
            <Typography role="status">Nenhum abastecimento registrado.</Typography>
          ) : (
            <Stack component="ul" spacing={2} sx={{ p: 0, m: 0, listStyle: 'none' }}>
              {data.refueling.map((fuel) => (
                <Stack
                  key={fuel.id}
                  component="li"
                  direction="row"
                  sx={{ justifyContent: 'space-between', gap: 2 }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{fuel.vehicle}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {fuel.detail}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {fuel.amount === null ? '—' : currency.format(fuel.amount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Card>
        <Card
          title="Alertas"
          action={
            data.alerts.length > 0 && (
              <Button
                onClick={() =>
                  onDetail({
                    title: 'Alertas da frota — demonstração',
                    description: data.alerts
                      .map((alert) => `${alert.title}: ${alert.detail}. ${alert.description}`)
                      .join('\n\n'),
                  })
                }
              >
                Abrir detalhes
              </Button>
            )
          }
        >
          {data.alerts.length === 0 ? (
            <Typography role="status">Nenhum alerta registrado.</Typography>
          ) : (
            <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0, listStyle: 'none' }}>
              {data.alerts.map((alert) => (
                <Stack
                  key={alert.id}
                  component="li"
                  direction="row"
                  className="dashboard-alert"
                  sx={{ alignItems: 'center', gap: 1 }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {alert.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alert.detail}
                    </Typography>
                  </Box>
                  <Button
                    aria-label={`Abrir ${alert.title}`}
                    onClick={() =>
                      onDetail({
                        title: alert.title,
                        description: `${alert.detail}. ${alert.description}`,
                      })
                    }
                  >
                    Abrir
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
        </Card>
      </Box>
    </>
  );
}
