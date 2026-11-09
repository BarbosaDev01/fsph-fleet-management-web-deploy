import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { authToken } from '@/shared/api/auth-token';
import { PasswordResetPage } from './PasswordResetPage';
import { demoResetPath, loadDemoResetContext, simulatePasswordReset } from './mocks/password-reset';

vi.mock('./mocks/password-reset', async (original) => ({
  ...(await original<typeof import('./mocks/password-reset')>()),
  loadDemoResetContext: vi.fn(),
  simulatePasswordReset: vi.fn(),
}));

function renderPage(path = demoResetPath) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <PasswordResetPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(loadDemoResetContext).mockReset().mockResolvedValue({ valid: true });
  vi.mocked(simulatePasswordReset).mockReset().mockResolvedValue(undefined);
});

it.each(['/alterar-senha', '/alterar-senha?token=link-real'])(
  'bloqueia o formulário sem um link demonstrativo: %s',
  (path) => {
    renderPage(path);
    expect(screen.getByText(/Link ausente ou indisponível/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nova Senha/)).not.toBeInTheDocument();
    expect(loadDemoResetContext).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Solicitar recuperação de senha' })).toHaveAttribute(
      'href',
      '/recuperar-senha',
    );
  },
);

it('valida a senha, permite exibi-la e conclui somente a simulação', async () => {
  const user = userEvent.setup();
  authToken.set('existing-session');
  renderPage();
  const password = await screen.findByLabelText(/^Nova Senha/);
  expect(password).toHaveAttribute('type', 'password');
  await user.click(screen.getByRole('button', { name: 'Alterar' }));
  expect(await screen.findByText('Use pelo menos 8 caracteres.')).toBeInTheDocument();
  await user.type(password, 'a'.repeat(129));
  await user.click(screen.getByRole('button', { name: 'Alterar' }));
  expect(await screen.findByText('Use até 128 caracteres.')).toBeInTheDocument();
  expect(simulatePasswordReset).not.toHaveBeenCalled();
  await user.clear(password);
  await user.type(password, 'NovaSenha@123');
  await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
  expect(password).toHaveAttribute('type', 'text');
  await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
  expect(password).toHaveAttribute('type', 'password');
  await user.click(screen.getByRole('button', { name: 'Alterar' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Sua senha real não foi alterada');
  expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute('href', '/login');
  expect(screen.queryByLabelText(/^Nova Senha/)).not.toBeInTheDocument();
  expect(authToken.get()).toBe('existing-session');
});

it('mostra carregamento do link e permite tentar novamente após falha', async () => {
  let rejectContext!: (error: Error) => void;
  vi.mocked(loadDemoResetContext).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectContext = reject;
      }),
  );
  const user = userEvent.setup();
  renderPage();
  expect(screen.getByRole('status')).toHaveTextContent('Carregando link demonstrativo');
  rejectContext(new Error('offline'));
  await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByLabelText(/^Nova Senha/)).toBeEnabled();
});

it('trata link demonstrativo inválido ou expirado', async () => {
  vi.mocked(loadDemoResetContext).mockResolvedValue({ valid: false });
  renderPage();
  expect(await screen.findByText('Link demonstrativo inválido ou expirado.')).toBeInTheDocument();
  expect(screen.queryByLabelText(/^Nova Senha/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute(
    'href',
    '/recuperar-senha',
  );
});

it('bloqueia envios duplicados e mantém a senha após erro para nova tentativa', async () => {
  let fail!: (error: Error) => void;
  vi.mocked(simulatePasswordReset).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        fail = reject;
      }),
  );
  const user = userEvent.setup();
  renderPage();
  const password = await screen.findByLabelText(/^Nova Senha/);
  await user.type(password, 'NovaSenha@123');
  await user.click(screen.getByRole('button', { name: 'Alterar' }));
  expect(await screen.findByRole('button', { name: /Simulando alteração/ })).toBeDisabled();
  expect(password).toBeDisabled();
  fail(new Error('offline'));
  await screen.findByText(/Não foi possível simular a alteração/);
  expect(password).toHaveValue('NovaSenha@123');
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Simulação concluída');
  expect(simulatePasswordReset).toHaveBeenCalledTimes(2);
});
