import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { routes } from '@/app/router';
import { queryClient } from '@/app/providers/queryClient';
import { authToken } from '@/shared/api/auth-token';
import type { Permission } from '@/shared/api/types';

vi.setConfig({ testTimeout: 20000 });

const vehicle = {
  id: 'vehicle-1',
  sectorId: null,
  plate: 'TST1A23',
  model: 'Spin',
  capacity: 7,
  usageType: 'ADMINISTRATIVO',
  currentOdometerKm: 10000,
  active: true,
  inMaintenance: false,
  available: true,
};
const station = {
  id: 'station-1',
  name: 'Posto Teste',
  cnpj: '00000000000100',
  city: 'Aracaju',
  state: 'SE',
  address: null,
  active: true,
};
function fueling(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fueling-1',
    vehicleId: vehicle.id,
    vehiclePlate: vehicle.plate,
    vehicleModel: vehicle.model,
    stationId: station.id,
    stationName: station.name,
    stationCnpj: station.cnpj,
    registeredByUserId: 'user-1',
    registeredByName: 'Gestor Teste',
    fueledOn: '2026-11-20',
    odometerKm: 10400,
    previousOdometerKm: 10000,
    distanceDrivenKm: 400,
    liters: 40,
    totalValue: 240,
    pricePerLiter: 6,
    fuelType: 'GASOLINE',
    consumptionKmPerLiter: 10,
    referenceAverageKmPerLiter: 10.5,
    outOfPattern: false,
    anomalyReason: null,
    createdAt: '2026-11-20T12:00:00Z',
    ...overrides,
  };
}

type Handler = (request: Request) => Response | Promise<Response>;
function mount(
  path: string,
  {
    role = 'GESTOR_FROTA',
    permissions,
    api,
  }: { role?: string; permissions: Permission[]; api: Handler },
) {
  queryClient.clear();
  const calls: Request[] = [];
  vi.stubGlobal('fetch', async (request: Request) => {
    if (new URL(request.url).pathname === '/api/v1/auth/me')
      return Response.json({
        id: 'user-1',
        name: 'Usuário Teste',
        email: 'teste@example.test',
        role,
        permissions,
        sectorId: null,
      });
    calls.push(request.clone());
    return api(request);
  });
  authToken.set('token');
  render(
    <AppProviders>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AppProviders>,
  );
  return { calls, user: userEvent.setup() };
}
const pathOf = (request: Request) => new URL(request.url).pathname;
afterEach(() => vi.unstubAllGlobals());

describe('Histórico de abastecimentos', () => {
  it('lista a frota, totaliza e filtra registros fora do padrão', async () => {
    const { user, calls } = mount('/abastecimentos', {
      permissions: ['FUELINGS_READ', 'FUELINGS_WRITE', 'FUEL_STATIONS_READ', 'VEHICLES_READ'],
      api: () =>
        Response.json([
          fueling(),
          fueling({
            id: 'fueling-2',
            fueledOn: '2026-11-22',
            odometerKm: 10600,
            liters: 50,
            totalValue: 300,
            consumptionKmPerLiter: 4,
            outOfPattern: true,
            anomalyReason: 'Consumo 62% abaixo da média',
          }),
        ]),
    });
    expect(
      await screen.findByRole('heading', { name: 'Histórico de abastecimentos' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('2 de 2 abastecimentos')).toBeInTheDocument();
    expect(calls.some((request) => pathOf(request) === '/api/v1/fuelings')).toBe(true);
    expect(screen.getByText(/R\$\s540,00/)).toBeInTheDocument();
    const rows = within(screen.getByRole('region', { name: /Tabela de registros/ })).getAllByRole(
      'row',
    );
    expect(within(rows[1]!).getByText('22/11/2026')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Fora do padrão')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Somente fora do padrão'));
    expect(screen.getByText('1 de 2 abastecimentos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Registrar abastecimento/ })).toBeInTheDocument();
  });

  it('consulta apenas os próprios registros quando o perfil só registra', async () => {
    const { calls } = mount('/abastecimentos', {
      role: 'MOTORISTA',
      permissions: ['FUELINGS_WRITE', 'FUEL_STATIONS_READ', 'VEHICLES_ASSIGNED_READ'],
      api: () => Response.json([]),
    });
    expect(await screen.findByText('Nenhum abastecimento registrado')).toBeInTheDocument();
    expect(calls.map(pathOf)).toContain('/api/v1/fuelings/mine');
    expect(calls.map(pathOf)).not.toContain('/api/v1/fuelings');
  });

  it('oculta o cadastro para perfil somente de consulta', async () => {
    mount('/abastecimentos', {
      permissions: ['FUELINGS_READ'],
      api: () => Response.json([]),
    });
    expect(await screen.findByText('Nenhum abastecimento registrado')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Registrar abastecimento/ })).not.toBeInTheDocument();
  });
});

describe('Registro de abastecimento', () => {
  const permissions: Permission[] = [
    'FUELINGS_READ',
    'FUELINGS_WRITE',
    'FUEL_STATIONS_READ',
    'VEHICLES_READ',
  ];
  async function fill(user: ReturnType<typeof userEvent.setup>, odometer = '10400') {
    await user.click(await screen.findByRole('combobox', { name: /Veículo/ }));
    await user.click(screen.getByRole('option', { name: 'TST1A23 · Spin' }));
    await user.click(screen.getByRole('combobox', { name: /Posto credenciado/ }));
    await user.click(screen.getByRole('option', { name: /Posto Teste/ }));
    await user.click(screen.getByRole('combobox', { name: /Combustível/ }));
    await user.click(screen.getByRole('option', { name: 'Gasolina' }));
    await user.clear(screen.getByLabelText(/^Data do abastecimento/));
    await user.type(screen.getByLabelText(/^Data do abastecimento/), '2026-11-20');
    await user.type(screen.getByLabelText(/^Hodômetro/), odometer);
    await user.type(screen.getByLabelText(/^Litros/), '40,5');
    await user.type(screen.getByLabelText(/^Valor total/), '243,00');
  }
  function api(post: Handler): Handler {
    return (request) => {
      const path = pathOf(request);
      if (request.method === 'POST') return post(request);
      if (path === '/api/v1/vehicles') return Response.json([vehicle]);
      if (path === '/api/v1/fuel-stations') return Response.json([station]);
      return Response.json([]);
    };
  }

  it('envia o contrato do backend e volta ao histórico com confirmação', async () => {
    const { user, calls } = mount('/abastecimentos/novo', {
      permissions,
      api: api(() => Response.json(fueling(), { status: 201 })),
    });
    await fill(user);
    expect((screen.getByLabelText('Preço por litro') as HTMLInputElement).value).toMatch(
      /^R\$\s6,00$/,
    );
    await user.click(screen.getByRole('button', { name: 'Registrar abastecimento' }));

    expect(await screen.findByText(/registrado\./)).toBeInTheDocument();
    const post = calls.find((request) => request.method === 'POST')!;
    expect(pathOf(post)).toBe('/api/v1/fuelings');
    expect(await post.json()).toEqual({
      vehicleId: 'vehicle-1',
      stationId: 'station-1',
      fuelType: 'GASOLINE',
      fueledOn: '2026-11-20',
      odometerKm: 10400,
      liters: 40.5,
      totalValue: 243,
    });
    expect(
      screen.getByRole('heading', { name: 'Histórico de abastecimentos' }),
    ).toBeInTheDocument();
  });

  it('bloqueia hodômetro menor que o atual do veículo sem chamar a API', async () => {
    const { user, calls } = mount('/abastecimentos/novo', {
      permissions,
      api: api(() => Response.json(fueling(), { status: 201 })),
    });
    await fill(user, '9000');
    await user.click(screen.getByRole('button', { name: 'Registrar abastecimento' }));
    expect(
      await screen.findByText(/não pode ser menor que a atual do veículo/),
    ).toBeInTheDocument();
    expect(calls.some((request) => request.method === 'POST')).toBe(false);
  });

  it('preserva o formulário e mostra a recusa do servidor', async () => {
    const { user } = mount('/abastecimentos/novo', {
      permissions,
      api: api(() =>
        Response.json(
          {
            detail:
              'A quilometragem do abastecimento deve ser maior que a do último abastecimento registrado',
          },
          { status: 409 },
        ),
      ),
    });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Registrar abastecimento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /maior que a do último abastecimento registrado/,
    );
    expect(screen.getByLabelText(/^Hodômetro/)).toHaveValue('10400');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Registrar abastecimento' })).toBeEnabled(),
    );
  });

  it('restringe o acesso direto sem permissão de registro', async () => {
    mount('/abastecimentos/novo', {
      permissions: ['FUELINGS_READ'],
      api: () => Response.json([]),
    });
    expect(await screen.findByText(/Acesso restrito/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Registrar abastecimento' }),
    ).not.toBeInTheDocument();
  });
});
