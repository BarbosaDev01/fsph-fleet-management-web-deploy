import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AppProviders } from '@/app/providers/AppProviders';
import { queryClient } from '@/app/providers/queryClient';
import { authToken } from '@/shared/api/auth-token';
import { UsersPage } from './RegistryPages';

const base = `${window.location.origin}/api/v1`;
const sectors = [
  { id: 'lacen', name: 'Superintendência Lacen' },
  { id: 'hemose', name: 'Superintendência Hemose' },
  { id: 'svo', name: 'Superintendência SVO' },
];
const original = {
  id: 'person',
  name: 'Pessoa de teste',
  email: 'pessoa@fsph.test',
  role: 'MOTORISTA',
  sectorId: 'lacen',
  sectorName: sectors[0]!.name,
  active: true,
};
const server = setupServer(
  http.get(`${base}/auth/me`, () =>
    HttpResponse.json({
      id: 'admin',
      role: 'ADMIN',
      permissions: ['USERS_READ', 'USERS_WRITE', 'SECTORS_READ'],
    }),
  ),
  http.get(`${base}/sectors`, () => HttpResponse.json(sectors)),
);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});

function openUsers() {
  authToken.set('local-test');
  render(
    <AppProviders>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </AppProviders>,
  );
}

it.each([
  ['Setor de lotação', 'Superintendência SVO', { sectorId: 'svo', role: 'MOTORISTA' }],
  ['Perfil de acesso', 'Colaborador', { sectorId: 'lacen', role: 'EMPLOYEE' }],
])('altera somente %s e preserva o outro vínculo', async (field, option, expected) => {
  let current = { ...original };
  const update = vi.fn();
  server.use(
    http.get(`${base}/users`, () => HttpResponse.json([current])),
    http.put(`${base}/users/person`, async ({ request }) => {
      const body = (await request.json()) as typeof original;
      update(body);
      current = {
        ...current,
        ...body,
        sectorName: sectors.find((s) => s.id === body.sectorId)!.name,
      };
      return HttpResponse.json(current);
    }),
  );
  openUsers();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Editar' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByRole('combobox', { name: 'Setor de lotação' })).toHaveTextContent(
    'Superintendência Lacen',
  );
  expect(dialog.getByRole('combobox', { name: 'Perfil de acesso' })).toHaveTextContent('Motorista');
  await user.click(dialog.getByRole('combobox', { name: field }));
  await user.click(screen.getByRole('option', { name: option }));
  await user.click(dialog.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(update).toHaveBeenCalledWith(expect.objectContaining(expected));
  expect(screen.getByRole('row', { name: /Pessoa de teste/ })).toHaveTextContent(option);
});

it('mostra lotação pendente e exige correção explícita sem escolher Administrativo', async () => {
  server.use(
    http.get(`${base}/users`, () =>
      HttpResponse.json([{ ...original, sectorId: null, sectorName: null }]),
    ),
  );
  openUsers();
  const user = userEvent.setup();
  expect(await screen.findByText('Lotação pendente')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Editar' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByRole('combobox', { name: 'Setor de lotação' })).not.toHaveTextContent('Lacen');
  await user.click(dialog.getByRole('button', { name: 'Salvar' }));
  expect(await dialog.findByText('Preencha este campo.')).toBeVisible();
});

it('mantém os valores e apresenta a mensagem da API quando o vínculo é recusado', async () => {
  server.use(
    http.get(`${base}/users`, () => HttpResponse.json([original])),
    http.put(`${base}/users/person`, () =>
      HttpResponse.json(
        { detail: 'Setor de lotação não encontrado.', code: 'RESOURCE_NOT_FOUND' },
        { status: 404 },
      ),
    ),
  );
  openUsers();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Editar' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Salvar' }));
  expect(await dialog.findByText('Setor de lotação não encontrado.')).toBeVisible();
  expect(dialog.getByRole('combobox', { name: 'Setor de lotação' })).toHaveTextContent(
    'Superintendência Lacen',
  );
  expect(dialog.getByRole('combobox', { name: 'Perfil de acesso' })).toHaveTextContent('Motorista');
});
