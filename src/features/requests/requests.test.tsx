import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { routes } from '@/app/router';
import { AppProviders } from '@/app/providers/AppProviders';
import { queryClient } from '@/app/providers/queryClient';
import { authToken } from '@/shared/api/auth-token';
import { permissions } from '@/shared/api/types';
import { requestBody, requestDateInput } from './form';
import type { TripRequest } from './api';

const base = `${window.location.origin}/api/v1`;
let granted: string[] = [];
let record: TripRequest;
const server = setupServer(
  http.get(`${base}/auth/me`, () =>
    HttpResponse.json({
      id: 'u1',
      sectorId: 's1',
      name: 'Conta real',
      email: 'user@example.test',
      role: 'ADMIN',
      permissions: granted,
    }),
  ),
  http.get(`${base}/trip-requests`, () => HttpResponse.json([record])),
  http.get(`${base}/trip-requests/mine`, () => HttpResponse.json([record])),
  http.get(`${base}/trip-requests/r1`, () => HttpResponse.json(record)),
  http.get(`${base}/trip-requests/r1/availability`, () =>
    HttpResponse.json({
      tripRequestId: 'r1',
      availableVehicles: [
        { id: 'vehicle-id', plate: 'ABC1D23', model: 'Van', availablePassengerSeats: 7 },
      ],
      availableDrivers: [
        { driverId: 'driver-id', userId: 'different-user-id', name: 'Motorista disponível' },
      ],
    }),
  ),
);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  granted = [...permissions];
  record = {
    id: 'r1',
    requesterId: 'u1',
    requesterName: 'Conta real',
    requesterSectorName: 'Administrativo',
    origin: 'FSPH',
    destination: 'Hospital',
    purpose: 'Atendimento',
    departureAt: '2030-01-05T12:00:00Z',
    expectedReturnAt: '2030-01-05T15:00:00Z',
    passengerCount: 2,
    status: 'PENDING',
  };
  authToken.set('request-token');
});
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());

function mount(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}
function fillPeriod(returnAt = '2030-01-05T12:00') {
  for (const [label, value] of Object.entries({
    Origem: 'FSPH',
    Destino: 'Hospital novo',
    Finalidade: 'Coleta',
    'Saída prevista': '2030-01-05T09:00',
    'Retorno previsto': returnAt,
    'Número de passageiros': '2',
  }))
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

it('nega a rota sem autoridade mesmo para o papel ADMIN e não consulta seus dados', async () => {
  granted = [];
  const list = vi.fn(() => HttpResponse.json([]));
  server.use(http.get(`${base}/users`, list));
  mount('/usuarios');
  expect(
    await screen.findByText(/Sua conta não tem permissão para consultar este módulo/),
  ).toBeVisible();
  expect(list).not.toHaveBeenCalled();
});

it('usa mine para solicitantes e oculta ações de gerenciamento', async () => {
  granted = ['TRIP_REQUESTS_WRITE'];
  const mine = vi.fn(() => HttpResponse.json([record]));
  const all = vi.fn(() => HttpResponse.json([]));
  server.use(http.get(`${base}/trip-requests/mine`, mine), http.get(`${base}/trip-requests`, all));
  mount('/solicitacoes');
  expect(await screen.findByRole('cell', { name: 'Hospital' })).toBeVisible();
  expect(mine).toHaveBeenCalledOnce();
  expect(all).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('link', { name: 'Ver solicitação' }));
  expect(await screen.findByRole('button', { name: 'Editar solicitação' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Aprovar solicitação' })).not.toBeInTheDocument();
});

it('não permite editar nem cancelar a solicitação de outro usuário', async () => {
  record.requesterId = 'outro-usuario';
  mount('/solicitacoes/r1');
  await screen.findByRole('heading', { name: 'FSPH → Hospital' });
  expect(screen.queryByRole('button', { name: 'Editar solicitação' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar solicitação' })).not.toBeInTheDocument();
});

it('valida o período antes de enviar o cadastro', async () => {
  const create = vi.fn(() => HttpResponse.json(record, { status: 201 }));
  server.use(http.post(`${base}/trip-requests`, create));
  mount('/solicitacoes/nova');
  await screen.findByRole('dialog');
  fillPeriod('2030-01-05T08:00');
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  expect(await screen.findByText('O retorno deve ser posterior à saída.')).toBeVisible();
  expect(create).not.toHaveBeenCalled();
});

it('envia o DTO canônico com Fortaleza em UTC e atualiza a listagem após salvar', async () => {
  const create = vi.fn();
  server.use(
    http.post(`${base}/trip-requests`, async ({ request }) => {
      const body = await request.json();
      create(body);
      record = { ...record, ...(body as object) };
      return HttpResponse.json(record, { status: 201 });
    }),
  );
  const router = mount('/solicitacoes/nova');
  await screen.findByRole('dialog');
  fillPeriod();
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  expect(await screen.findByRole('cell', { name: 'Hospital novo' })).toBeVisible();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(router.state.location.pathname).toBe('/solicitacoes');
  expect(create).toHaveBeenCalledWith({
    origin: 'FSPH',
    destination: 'Hospital novo',
    purpose: 'Coleta',
    passengerCount: 2,
    departureAt: '2030-01-05T12:00:00.000Z',
    expectedReturnAt: '2030-01-05T15:00:00.000Z',
  });
});

it('mostra validações HTTP e preserva os valores quando a API recusa a criação', async () => {
  server.use(
    http.post(`${base}/trip-requests`, () =>
      HttpResponse.json(
        {
          detail: 'Dados inválidos',
          violations: [{ field: 'purpose', message: 'Finalidade recusada pela API' }],
        },
        { status: 400 },
      ),
    ),
  );
  mount('/solicitacoes/nova');
  await screen.findByRole('dialog');
  fillPeriod();
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  expect(await screen.findByText('Finalidade recusada pela API')).toBeVisible();
  expect(screen.getByLabelText('Destino')).toHaveValue('Hospital novo');
});

it('aprova e agenda com IDs de Driver e Vehicle retornados pela disponibilidade', async () => {
  const schedule = vi.fn();
  server.use(
    http.patch(`${base}/trip-requests/r1/approve`, () => {
      record.status = 'APPROVED';
      return HttpResponse.json(record);
    }),
    http.patch(`${base}/trip-requests/r1/schedule`, async ({ request }) => {
      schedule(await request.json());
      record.status = 'SCHEDULED';
      return HttpResponse.json(record);
    }),
  );
  mount('/solicitacoes/r1');
  await userEvent.click(await screen.findByRole('button', { name: 'Aprovar solicitação' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const button = await screen.findByRole('button', { name: 'Agendar viagem' });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  await userEvent.click(screen.getByRole('combobox', { name: 'Veículo disponível' }));
  await userEvent.click(screen.getByRole('option', { name: /ABC1D23/ }));
  await userEvent.click(screen.getByRole('combobox', { name: 'Motorista disponível' }));
  await userEvent.click(screen.getByRole('option', { name: 'Motorista disponível' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  expect(await screen.findByText(/Agendamento confirmado pela API/)).toBeVisible();
  expect(schedule).toHaveBeenCalledWith({ vehicleId: 'vehicle-id', driverId: 'driver-id' });
});

it('distingue lista vazia de erro HTTP sem mostrar dados fictícios', async () => {
  server.use(http.get(`${base}/trip-requests`, () => HttpResponse.json([])));
  mount('/solicitacoes');
  expect(await screen.findByText('Nenhum registro encontrado.')).toBeVisible();
});

it('mantém a sessão e informa o acesso negado pelo backend', async () => {
  server.use(
    http.get(`${base}/trip-requests`, () =>
      HttpResponse.json({ detail: 'Acesso negado' }, { status: 403 }),
    ),
  );
  mount('/solicitacoes');
  expect(await screen.findByText('Acesso negado')).toBeVisible();
  expect(authToken.get()).toBe('request-token');
});

it('converte ida e volta sem depender do fuso do navegador', () => {
  expect(requestDateInput('2030-01-05T00:30:00Z')).toBe('2030-01-04T21:30');
  expect(
    requestBody({
      origin: 'A',
      destination: 'B',
      purpose: 'C',
      passengerCount: '1',
      departureAt: '2030-01-04T21:30',
      expectedReturnAt: '2030-01-05T00:30',
    }).departureAt,
  ).toBe('2030-01-05T00:30:00.000Z');
});
