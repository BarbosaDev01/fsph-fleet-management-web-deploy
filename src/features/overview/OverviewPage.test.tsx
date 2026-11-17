import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AppProviders } from '@/app/providers/AppProviders';
import { queryClient } from '@/app/providers/queryClient';
import { authToken } from '@/shared/api/auth-token';
import { permissions } from '@/shared/api/types';
import { OverviewPage } from './OverviewPage';

const base = `${window.location.origin}/api/v1`;
let granted: string[];
const vehicles = vi.fn(() => HttpResponse.json([]));
const server = setupServer(
  http.get(`${base}/auth/me`, () =>
    HttpResponse.json({ id: 'u1', name: 'Conta', role: 'ADMIN', permissions: granted }),
  ),
  http.get(`${base}/vehicles`, vehicles),
  http.get(`${base}/drivers`, () => HttpResponse.json([])),
  http.get(`${base}/trip-requests`, () => HttpResponse.json([])),
);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  granted = [...permissions];
  vehicles.mockClear();
  authToken.set('overview-token');
});
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());
function mount() {
  render(
    <AppProviders>
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    </AppProviders>,
  );
}

it('mostra zero somente depois de receber coleções vazias da API', async () => {
  mount();
  await waitFor(() => expect(screen.getAllByText('0', { selector: 'p' })).toHaveLength(4));
  expect(vehicles).toHaveBeenCalledOnce();
});

it('mantém erro de uma fonte separado dos indicadores disponíveis', async () => {
  server.use(
    http.get(`${base}/vehicles`, () =>
      HttpResponse.json({ detail: 'Consulta de frota recusada' }, { status: 403 }),
    ),
  );
  mount();
  expect(await screen.findByText('Consulta de frota recusada')).toBeVisible();
  const card = screen
    .getByRole('heading', { name: 'Veículos ativos' })
    .closest('.MuiPaper-root') as HTMLElement;
  expect(within(card).queryByText('0')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText('0', { selector: 'p' })).toHaveLength(3));
});

it('não consulta fontes que a conta não está autorizada a ler', async () => {
  granted = [];
  mount();
  await waitFor(() =>
    expect(queryClient.getQueryData(['session', 'overview-token'])).toBeDefined(),
  );
  expect(screen.getAllByText('Consulta não autorizada para sua conta.')).toHaveLength(4);
  expect(vehicles).not.toHaveBeenCalled();
});
