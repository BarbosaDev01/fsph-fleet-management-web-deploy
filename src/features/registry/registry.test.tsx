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

const base = `${window.location.origin}/api/v1`;
vi.mock('@/shared/config/env', () => ({ env: { apiBaseUrl: '/api', isStaging: true } }));
let granted: string[];
const vehicle = {
  id: 'v1',
  sectorId: null,
  plate: 'ABC1D23',
  model: 'Van',
  capacity: 8,
  usageType: 'Coleta',
  currentOdometerKm: 1200,
  active: true,
};
const server = setupServer(
  http.get(`${base}/auth/me`, () =>
    HttpResponse.json({
      id: 'u1',
      name: 'Usuário autenticado',
      email: 'user@test.example',
      role: 'ADMIN',
      sectorId: 's1',
      permissions: granted,
    }),
  ),
  http.get(`${base}/sectors`, () => HttpResponse.json([{ id: 's1', name: 'Administrativo' }])),
  http.get(`${base}/vehicles`, () => HttpResponse.json([vehicle])),
  http.get(`${base}/drivers`, () => HttpResponse.json([])),
  http.get(`${base}/users`, () =>
    HttpResponse.json([
      {
        id: 'motorista-user',
        name: 'Motorista ativo',
        email: 'motorista@example.test',
        role: 'MOTORISTA',
        active: true,
      },
      {
        id: 'admin-user',
        name: 'Administrador',
        email: 'admin@example.test',
        role: 'ADMIN',
        active: true,
      },
      {
        id: 'inactive-user',
        name: 'Motorista inativo',
        email: 'inativo@example.test',
        role: 'MOTORISTA',
        active: false,
      },
    ]),
  ),
);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  granted = [...permissions];
  authToken.set('registry-token');
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

it('substitui o cadastro duplicado pelo módulo real através do alias', async () => {
  const router = mount('/demonstracoes/frota/veiculos');
  expect(await screen.findByRole('cell', { name: 'ABC1D23' })).toBeVisible();
  expect(router.state.location.pathname).toBe('/veiculos');
});

it('consulta veículos sem oferecer escrita a quem tem somente leitura', async () => {
  granted = ['VEHICLES_READ'];
  mount('/veiculos');
  expect(await screen.findByRole('cell', { name: 'ABC1D23' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Novo veículo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Detalhes' })).toHaveAttribute('href', '/veiculos/v1');
});

it('combina busca e situação e limpa os filtros', async () => {
  mount('/veiculos');
  await screen.findByText('ABC1D23');
  fireEvent.change(screen.getByLabelText('Buscar em veículos'), { target: { value: 'Van' } });
  await userEvent.click(screen.getByRole('combobox', { name: 'Situação' }));
  await userEvent.click(screen.getByRole('option', { name: 'Inativo' }));
  expect(screen.getByText('Nenhum registro encontrado.')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  expect(screen.getByText('ABC1D23')).toBeVisible();
});

it('cria motorista exclusivamente pelo userId de um MOTORISTA ativo', async () => {
  const create = vi.fn();
  server.use(
    http.post(`${base}/drivers`, async ({ request }) => {
      create(await request.json());
      return HttpResponse.json({ id: 'driver-id', userId: 'motorista-user' }, { status: 201 });
    }),
  );
  mount('/motoristas');
  const button = await screen.findByRole('button', { name: 'Novo motorista' });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  await userEvent.click(screen.getByRole('combobox', { name: 'Usuário motorista' }));
  expect(screen.queryByRole('option', { name: /Administrador/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Motorista inativo/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('option', { name: /Motorista ativo/ }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ userId: 'motorista-user' }));
  expect(screen.queryByLabelText('Veículo')).not.toBeInTheDocument();
});

it('não substitui uma falha no carregamento de usuários por um ID digitado', async () => {
  server.use(
    http.get(`${base}/users`, () =>
      HttpResponse.json({ detail: 'Consulta recusada' }, { status: 403 }),
    ),
  );
  mount('/motoristas');
  expect(await screen.findByText('Consulta recusada')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Novo motorista' })).toBeDisabled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('preserva permissões desconhecidas na substituição do perfil', async () => {
  let replaced: unknown;
  server.use(
    http.get(`${base}/roles/permissions`, () =>
      HttpResponse.json({ ADMIN: ['USERS_READ', 'FUTURE_READ'], EMPLOYEE: ['FUTURE_READ'] }),
    ),
    http.put(`${base}/roles/EMPLOYEE/permissions`, async ({ request }) => {
      replaced = await request.json();
      return HttpResponse.json(['USERS_READ', 'FUTURE_READ']);
    }),
  );
  mount('/permissoes');
  const heading = await screen.findByRole('heading', { name: 'Colaborador' });
  const panel = heading.closest('.MuiPaper-root') as HTMLElement;
  await userEvent.click(within(panel).getByRole('checkbox', { name: 'Consultar usuários' }));
  await userEvent.click(
    within(panel).getByRole('button', { name: 'Salvar permissões de Colaborador' }),
  );
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(replaced).toEqual({ permissions: ['FUTURE_READ', 'USERS_READ'] }));
});

it('abre o cadastro pela rota e salva perfil e setor sem exigir leitura de usuários', async () => {
  granted = ['USERS_WRITE', 'SECTORS_READ'];
  const list = vi.fn(() => HttpResponse.json([]));
  const create = vi.fn();
  server.use(
    http.get(`${base}/users`, list),
    http.post(`${base}/users`, async ({ request }) => {
      create(await request.json());
      return HttpResponse.json({ id: 'created-user' }, { status: 201 });
    }),
  );
  const router = mount('/usuarios');
  const button = await screen.findByRole('button', { name: 'Novo usuário' });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  expect(router.state.location.pathname).toBe('/usuarios/novo');
  await screen.findByRole('dialog', { name: 'Novo usuário' });
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nova pessoa' } });
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@fsph.test' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaLocal-2026!' } });
  await userEvent.click(screen.getByRole('combobox', { name: 'Setor de lotação' }));
  await userEvent.click(screen.getByRole('option', { name: 'Administrativo' }));
  await userEvent.click(screen.getByRole('combobox', { name: 'Perfil de acesso' }));
  expect(screen.getAllByRole('option')).toHaveLength(7);
  await userEvent.click(screen.getByRole('option', { name: 'Gestor SVO' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));
  await waitFor(() =>
    expect(create).toHaveBeenCalledWith({
      name: 'Nova pessoa',
      email: 'nova@fsph.test',
      password: 'SenhaLocal-2026!',
      sectorId: 's1',
      role: 'GESTOR_SVO',
    }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(router.state.location.pathname).toBe('/usuarios');
  expect(list).not.toHaveBeenCalled();
});

it('explica a dependência de setores e não abre um cadastro incompleto', async () => {
  granted = ['USERS_WRITE'];
  const sectors = vi.fn(() => HttpResponse.json([]));
  server.use(http.get(`${base}/sectors`, sectors));
  mount('/usuarios/novo');
  expect(
    await screen.findByText(/sua conta também precisa de permissão para consultar/),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Novo usuário' })).toBeDisabled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(sectors).not.toHaveBeenCalled();
});

it('nega cadastro por acesso direto para uma conta que só consulta usuários', async () => {
  granted = ['USERS_READ'];
  mount('/usuarios/novo');
  expect(await screen.findByText(/Acesso restrito/)).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
