import { render, screen, within, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { demoDashboard, loadDemoDashboard } from './mocks/dashboard';
import { authToken } from '@/shared/api/auth-token';

vi.mock('./mocks/dashboard', async (original) => ({
  ...(await original<typeof import('./mocks/dashboard')>()),
  loadDemoDashboard: vi.fn(),
}));

function renderPage(demo = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/demonstracoes/dashboard-usuarios']}>
        <Routes>
          <Route path="/demonstracoes/dashboard-usuarios" element={<DashboardPage demo={demo} />} />
          <Route path="/login" element={<p>Página de login</p>} />
          <Route path="/" element={<p>Sistema real</p>} />
          <Route path="/demonstracoes/diretorio" element={<p>Lista de usuários</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(loadDemoDashboard).mockReset().mockResolvedValue(structuredClone(demoDashboard));
});

it('mostra carregamento e permite tentar novamente após falha', async () => {
  let fail!: (error: Error) => void;
  vi.mocked(loadDemoDashboard).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        fail = reject;
      }),
  );
  const user = userEvent.setup();
  renderPage();
  expect(screen.getByRole('status')).toHaveTextContent('Carregando dashboard');
  fail(new Error('offline'));
  await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('table', { name: 'Rotas ativas' })).toBeInTheDocument();
});

it('filtra rotas, distingue nenhum resultado e permite limpar filtros', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-09T12:00:00-03:00'));
  try {
    const user = userEvent.setup();
    renderPage();
    const table = await screen.findByRole('table', { name: 'Rotas ativas' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por setor' }));
    await user.click(screen.getByRole('option', { name: 'Administrativo' }));
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por período' }));
    await user.click(screen.getByRole('option', { name: 'Hoje (data atual)' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum resultado para os filtros');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  } finally {
    vi.useRealTimers();
  }
});

it('mostra listas e histórico vazios sem fabricar registros', async () => {
  vi.mocked(loadDemoDashboard).mockResolvedValue({
    ...demoDashboard,
    routes: [],
    alerts: [],
    refueling: [],
    dailyRequests: [],
  });
  renderPage();
  expect(await screen.findByText('Nenhuma rota ativa cadastrada.')).toBeInTheDocument();
  expect(screen.getByText('Nenhum alerta registrado.')).toBeInTheDocument();
  expect(screen.getByText('Nenhum abastecimento registrado.')).toBeInTheDocument();
  expect(screen.getByText('Sem histórico de solicitações.')).toBeInTheDocument();
});

it('abre detalhes e volta ao sistema sem descartar a sessão autenticada', async () => {
  const user = userEvent.setup();
  authToken.set('existing-token');
  renderPage();
  await user.click(
    await screen.findByRole('button', { name: 'Abrir Carro 01 — Troca de suspensão' }),
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('Veículo em manutenção');
  await user.click(screen.getByRole('button', { name: 'Fechar' }));
  await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  await user.click(screen.getByRole('button', { name: 'Veículos' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('ainda não está implementada');
  await user.click(screen.getByRole('button', { name: 'Fechar' }));
  await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  await user.click(
    within(screen.getByRole('main')).getByRole('button', { name: 'Voltar ao sistema' }),
  );
  expect(await screen.findByText('Sistema real')).toBeInTheDocument();
  expect(authToken.get()).toBe('existing-token');
});

it('redireciona a rota normal sem token e não carrega dados', async () => {
  renderPage(false);
  expect(await screen.findByText('Página de login')).toBeInTheDocument();
  expect(loadDemoDashboard).not.toHaveBeenCalled();
});

it('mantém dados anteriores quando a atualização falha', async () => {
  const user = userEvent.setup();
  renderPage();
  await screen.findByRole('table');
  vi.mocked(loadDemoDashboard).mockRejectedValueOnce(new Error('offline'));
  await user.click(screen.getByRole('button', { name: 'Atualizar dados' }));
  expect(await screen.findByText(/Falha ao atualizar/)).toBeInTheDocument();
  expect(screen.getByRole('table')).toBeInTheDocument();
});
