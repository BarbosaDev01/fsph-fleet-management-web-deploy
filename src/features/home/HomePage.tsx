import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { initialDrivers, initialVehicles } from './demo-data';
import type { Vehicle } from './types';
import { RegistrationDialog } from './RegistrationDialog';
import { DemoStates } from './DemoStates';

export function HomePage() {
  const [tab, setTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [open, setOpen] = useState(false);

  const [sectorFilter, setSectorFilter] = useState('Todos');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  function clearFilters() {
    setSearch('');
    setFilter('Todos');
    setSectorFilter('Todos');
  }

  const visibleVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const text = `${vehicle.plate} ${vehicle.model} ${vehicle.driver} ${vehicle.category}`;
        return (
          text.toLowerCase().includes(search.trim().toLowerCase()) &&
          (filter === 'Todos' || vehicle.status === filter)
        );
      }),
    [vehicles, search, filter],
  );

  const visibleDrivers = useMemo(
    () =>
      drivers.filter((driver) => {
        const text = `${driver.name} ${driver.license} ${driver.sector}`;
        return (
          text.toLowerCase().includes(search.trim().toLowerCase()) &&
          (filter === 'Todos' || driver.status === filter) &&
          (sectorFilter === 'Todos' || driver.sector === sectorFilter)
        );
      }),
    [drivers, search, filter, sectorFilter],
  );

  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'Ativo').length;
  const maintenance = vehicles.filter((vehicle) => vehicle.status === 'Manutenção').length;

  return (
    <Box component="main" sx={{ minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
              FSPH · GESTÃO DE FROTAS
            </Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, mt: 1 }}>
              Motoristas e Veículos
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Gerencie os cadastros e acompanhe as informações da frota.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            {[
              { label: 'Total de veículos', value: vehicles.length },
              { label: 'Veículos ativos', value: activeVehicles },
              { label: 'Em manutenção', value: maintenance },
              { label: 'Motoristas', value: drivers.length },
            ].map((item) => (
              <Paper key={item.label} variant="outlined" sx={{ p: 3 }}>
                <Typography color="text.secondary" variant="body2">
                  {item.label}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                  {item.value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 3, pt: 1 }}>
              <Tabs
                value={tab}
                onChange={(_, value: 'vehicles' | 'drivers') => {
                  setTab(value);
                  clearFilters();
                }}
              >
                <Tab label="Veículos" value="vehicles" />
                <Tab label="Motoristas" value="drivers" />
              </Tabs>
            </Box>

            <Divider />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{
                p: 3,
                justifyContent: 'space-between',
                alignItems: { md: 'center' },
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {tab === 'vehicles' ? 'Veículos cadastrados' : 'Motoristas cadastrados'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pesquise e filtre os registros abaixo.
                </Typography>
              </Box>

              <Button variant="contained" onClick={() => setOpen(true)}>
                + Cadastrar {tab === 'vehicles' ? 'veículo' : 'motorista'}
              </Button>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ px: 3, pb: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Pesquisar"
                placeholder={tab === 'vehicles' ? 'Placa ou modelo' : 'Nome ou habilitação'}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <TextField
                select
                size="small"
                label="Status"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                {(tab === 'vehicles'
                  ? ['Ativo', 'Manutenção', 'Inativo']
                  : ['Disponível', 'Em rota']
                ).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
              {tab === 'drivers' && (
                <TextField
                  select
                  size="small"
                  label="Setor"
                  value={sectorFilter}
                  onChange={(event) => setSectorFilter(event.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  {[...new Set(drivers.map((driver) => driver.sector))].map((sector) => (
                    <MenuItem key={sector} value={sector}>
                      {sector}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Button onClick={clearFilters} sx={{ flexShrink: 0 }}>
                Limpar filtros
              </Button>
            </Stack>
            {tab === 'vehicles' && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 2 }}>
                Filtro de setor para veículos pendente de definição com a equipe e o backend.
              </Typography>
            )}

            <TableContainer>
              <Table>
                <TableHead>
                  {tab === 'vehicles' ? (
                    <TableRow>
                      <TableCell>Placa</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Categoria</TableCell>
                      <TableCell>Motorista</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Habilitação</TableCell>
                      <TableCell>Setor</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  )}
                </TableHead>

                <TableBody>
                  {tab === 'vehicles'
                    ? visibleVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{vehicle.plate}</TableCell>
                          <TableCell>{vehicle.model}</TableCell>
                          <TableCell>{vehicle.category}</TableCell>
                          <TableCell>{vehicle.driver}</TableCell>
                          <TableCell>
                            <Chip
                              label={vehicle.status}
                              color={
                                vehicle.status === 'Ativo'
                                  ? 'success'
                                  : vehicle.status === 'Manutenção'
                                    ? 'warning'
                                    : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              aria-label={`Detalhes do veículo ${vehicle.plate}`}
                              onClick={() => setSelectedVehicle(vehicle)}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    : visibleDrivers.map((driver) => (
                        <TableRow key={driver.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{driver.name}</TableCell>
                          <TableCell>{driver.license}</TableCell>
                          <TableCell>{driver.sector}</TableCell>
                          <TableCell>
                            <Chip
                              label={driver.status}
                              color={driver.status === 'Disponível' ? 'success' : 'info'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                  {(tab === 'vehicles' ? visibleVehicles.length : visibleDrivers.length) === 0 && (
                    <TableRow>
                      <TableCell colSpan={tab === 'vehicles' ? 6 : 4} align="center" sx={{ py: 4 }}>
                        {(tab === 'vehicles' ? vehicles.length : drivers.length) === 0
                          ? 'Nenhum cadastro nesta lista.'
                          : 'Nenhum resultado para os filtros selecionados.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />

            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Exibindo {tab === 'vehicles' ? visibleVehicles.length : visibleDrivers.length}{' '}
              registro(s). Dados demonstrativos.
            </Typography>
          </Paper>
          <DemoStates />
        </Stack>
      </Container>

      {open && (
        <RegistrationDialog
          tab={tab}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setOpen(false)}
          onVehicle={(vehicle) => {
            setVehicles((current) => [...current, vehicle]);
            clearFilters();
            setOpen(false);
          }}
          onDriver={(driver) => {
            setDrivers((current) => [...current, driver]);
            clearFilters();
            setOpen(false);
          }}
        />
      )}
      <Dialog
        open={selectedVehicle !== null}
        onClose={() => setSelectedVehicle(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="vehicle-details-title"
      >
        <DialogTitle id="vehicle-details-title">Detalhes do veículo</DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Stack spacing={1}>
              <Typography>Placa: {selectedVehicle.plate}</Typography>
              <Typography>Modelo: {selectedVehicle.model}</Typography>
              <Typography>Categoria: {selectedVehicle.category}</Typography>
              <Typography>Motorista: {selectedVehicle.driver}</Typography>
              <Typography>Status: {selectedVehicle.status}</Typography>
              <Alert severity="info">Dados demonstrativos. Integração com a API pendente.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedVehicle(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
