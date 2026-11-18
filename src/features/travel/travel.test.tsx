import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { routes } from '@/app/router';
import { AppProviders } from '@/app/providers/AppProviders';
import { queryClient } from '@/app/providers/queryClient';
import { authToken } from '@/shared/api/auth-token';
import { permissions } from '@/shared/api/types';

const base = `${window.location.origin}/api/v1`;
const server = setupServer(
  http.get(`${base}/auth/me`, () =>
    HttpResponse.json({
      id: 'admin',
      sectorId: 'sector',
      name: 'Admin',
      email: 'admin@fsph.test',
      role: 'ADMIN',
      permissions,
    }),
  ),
);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());
function renderPage(path: string) {
  authToken.set('token');
  render(
    <AppProviders>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AppProviders>,
  );
}

it.each([true, false])(
  'mostra execução somente ao condutor atribuído quando também possui gestão (própria: %s)',
  async (owned) => {
    server.use(
      http.get(`${base}/auth/me`, () =>
        HttpResponse.json({
          id: 'driver-user',
          role: 'MOTORISTA',
          name: 'Condutor',
          email: 'driver@fsph.test',
          permissions: ['ROUTES_READ', 'ROUTES_MANAGE', 'ROUTES_EXECUTE'],
        }),
      ),
      http.get(`${base}/routes/r1`, () =>
        HttpResponse.json({
          id: 'r1',
          driverId: 'registry-driver-id',
          driverUserId: owned ? 'driver-user' : 'another-user',
          driverName: 'Condutor atribuído',
          vehiclePlate: 'ABC1D23',
          status: 'PLANNED',
          plannedStartAt: '2030-01-01T12:00:00Z',
        }),
      ),
      http.get(`${base}/routes/r1/stops`, () => HttpResponse.json([])),
    );
    renderPage('/viagens/r1');
    await screen.findByText('ABC1D23 · Condutor atribuído');
    if (owned) expect(screen.getByRole('button', { name: 'Iniciar viagem' })).toBeVisible();
    else expect(screen.queryByRole('button', { name: 'Iniciar viagem' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reagendar' })).toBeVisible();
  },
);

it('não oferece cancelar uma parada planejada ao motorista sem gestão', async () => {
  server.use(
    http.get(`${base}/auth/me`, () =>
      HttpResponse.json({
        id: 'driver-user',
        role: 'MOTORISTA',
        name: 'Condutor',
        email: 'driver@fsph.test',
        permissions: ['ROUTES_READ', 'ROUTES_EXECUTE'],
      }),
    ),
    http.get(`${base}/routes/r1`, () =>
      HttpResponse.json({
        id: 'r1',
        driverId: 'registry-driver-id',
        driverUserId: 'driver-user',
        driverName: 'Condutor atribuído',
        vehiclePlate: 'ABC1D23',
        status: 'PLANNED',
        plannedStartAt: '2030-01-01T12:00:00Z',
      }),
    ),
    http.get(`${base}/routes/r1/stops`, () =>
      HttpResponse.json([
        {
          id: 'stop',
          stopSequence: 1,
          serviceType: 'Coleta',
          pickupLocation: 'FSPH',
          destination: 'Hospital',
          status: 'PENDING',
        },
      ]),
    ),
  );
  renderPage('/viagens/r1');
  await screen.findByText('Hospital');
  expect(screen.getByRole('button', { name: 'Iniciar viagem' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
});

it('envia paginação e filtros de transportes ao servidor', async () => {
  const user = userEvent.setup();
  const requests: URL[] = [];
  server.use(
    http.get(`${base}/transports`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get('page'));
      return HttpResponse.json({
        content: [
          {
            id: `t-${page}`,
            occurredAt: '2026-11-01T12:00:00Z',
            serviceType: `Serviço ${page + 1}`,
            pickupLocation: 'FSPH',
            destination: 'Hospital',
            status: 'PENDING',
          },
        ],
        page,
        size: 20,
        totalElements: 21,
        totalPages: 2,
      });
    }),
  );
  renderPage('/transportes');
  expect(await screen.findByText('Serviço 1')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /page 2|página 2/i }));
  expect(await screen.findByText('Serviço 2')).toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: 'Situação' }));
  await user.click(screen.getByRole('option', { name: 'Pendente' }));
  await waitFor(() => expect(requests.at(-1)?.searchParams.get('status')).toBe('PENDING'));
  expect(requests.at(-1)?.searchParams.get('page')).toBe('0');
  expect(requests.at(-1)?.searchParams.get('size')).toBe('20');
});

it('inicia a viagem com quilometragem numérica e atualiza o estado', async () => {
  const user = userEvent.setup();
  let status = 'PLANNED';
  const start = vi.fn();
  const route = () => ({
    id: 'r1',
    vehicleId: 'v1',
    driverId: 'd1',
    vehiclePlate: 'ABC1D23',
    driverName: 'João',
    status,
    plannedStartAt: '2026-11-01T12:00:00Z',
    plannedDurationMinutes: 60,
    plannedReturnAt: '2026-11-01T13:00:00Z',
    realStartAt: status === 'IN_PROGRESS' ? '2026-11-01T12:00:00Z' : null,
    realEndAt: null,
    startMileage: status === 'IN_PROGRESS' ? 1200 : null,
    endMileage: null,
  });
  server.use(
    http.get(`${base}/routes/r1`, () => HttpResponse.json(route())),
    http.get(`${base}/routes/r1/stops`, () => HttpResponse.json([])),
    http.post(`${base}/routes/r1/start`, async ({ request }) => {
      start(await request.json());
      status = 'IN_PROGRESS';
      return HttpResponse.json(route());
    }),
  );
  renderPage('/viagens/r1');
  await user.click(await screen.findByRole('button', { name: 'Iniciar viagem' }));
  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Quilometragem inicial (km)'), '1200');
  await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
  expect(await screen.findByRole('button', { name: 'Concluir viagem' })).toBeInTheDocument();
  expect(start).toHaveBeenCalledWith({ startMileage: 1200 });
  expect(screen.getByText('Em andamento')).toBeInTheDocument();
});
