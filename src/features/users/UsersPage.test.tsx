import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UsersPage } from './UsersPage';
import { demoDirectory, loadDemoDirectory } from './mocks/users';

vi.mock('./mocks/users', async (original) => ({
  ...(await original<typeof import('./mocks/users')>()),
  loadDemoDirectory: vi.fn(),
}));

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(loadDemoDirectory).mockReset().mockResolvedValue(demoDirectory);
});

it('mostra somente a categoria selecionada e identifica a demonstração', async () => {
  const user = userEvent.setup();
  renderPage();
  expect(screen.getByText(/Modo demonstrativo:/)).toBeInTheDocument();
  await screen.findByRole('table', { name: 'Lista de usuários' });
  await user.click(screen.getByRole('tab', { name: 'Perfis e permissões' }));
  expect(screen.getByRole('table', { name: 'Perfis e permissões' })).toBeInTheDocument();
  expect(screen.queryByRole('table', { name: 'Lista de usuários' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: 'Auditoria' }));
  expect(screen.getByRole('table', { name: 'Auditoria' })).toBeInTheDocument();
  expect(screen.queryByRole('table', { name: 'Perfis e permissões' })).not.toBeInTheDocument();
});

it('combina busca, perfil, setor e status e permite limpar os filtros', async () => {
  const user = userEvent.setup();
  renderPage();
  await screen.findByRole('table');
  for (const [label, option] of [
    ['Perfil', 'Motorista'],
    ['Setor', 'Transportes'],
    ['Status', 'Inativo'],
  ]) {
    await user.click(screen.getByRole('combobox', { name: label }));
    await user.click(screen.getByRole('option', { name: option }));
  }
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
  expect(screen.getByText('Pedro Almeida')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Buscar por nome ou e-mail'), 'inexistente');
  expect(screen.getByText('Nenhum usuário encontrado para os filtros.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7);
});

it('distingue lista vazia de busca sem resultados', async () => {
  vi.mocked(loadDemoDirectory).mockResolvedValue({ users: [], profiles: [], audit: [] });
  renderPage();
  expect(
    await screen.findByText('Nenhum usuário cadastrado nesta demonstração.'),
  ).toBeInTheDocument();
  expect(screen.queryByText('Nenhum usuário encontrado para os filtros.')).not.toBeInTheDocument();
});

it('mostra carregamento e permite tentar novamente após erro', async () => {
  vi.mocked(loadDemoDirectory).mockRejectedValueOnce(new Error('offline'));
  renderPage();
  expect(screen.getByText('Carregando categorias…')).toBeInTheDocument();
  await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('table', { name: 'Lista de usuários' })).toBeInTheDocument();
});
