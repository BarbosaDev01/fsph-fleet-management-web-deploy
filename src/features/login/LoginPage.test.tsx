import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { simulateLogin } from './mocks/login';

vi.mock('./mocks/login', async (original) => ({
  ...(await original<typeof import('./mocks/login')>()),
  simulateLogin: vi.fn(),
}));

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(simulateLogin).mockReset().mockResolvedValue(undefined);
});

it('valida os campos e permite mostrar a senha', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
  expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
  expect(simulateLogin).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
  expect(screen.getByLabelText(/^Senha/)).toHaveAttribute('type', 'text');
  expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute(
    'href',
    '/recuperar-senha',
  );
});

it('mantém os dados após erro e permite nova tentativa sem criar uma sessão', async () => {
  vi.mocked(simulateLogin).mockRejectedValueOnce(new Error('Falha simulada.'));
  const user = userEvent.setup();
  renderPage();
  await user.type(screen.getByLabelText(/^E-mail/), 'usuario@orgao.gov.br');
  await user.type(screen.getByLabelText(/^Senha/), 'Demo@123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Falha simulada.')).toBeInTheDocument();
  expect(screen.getByLabelText(/^E-mail/)).toHaveValue('usuario@orgao.gov.br');
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Nenhuma sessão autenticada foi criada',
  );
  await user.click(screen.getByRole('button', { name: 'Voltar ao login' }));
  expect(screen.getByLabelText(/^Senha/)).toHaveValue('');
});

it('bloqueia novos envios durante a verificação', async () => {
  let complete!: () => void;
  vi.mocked(simulateLogin).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const user = userEvent.setup();
  renderPage();
  await user.type(screen.getByLabelText(/^E-mail/), 'usuario@orgao.gov.br');
  await user.type(screen.getByLabelText(/^Senha/), 'Demo@123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('button', { name: /Verificando/ })).toBeDisabled();
  expect(screen.getByLabelText(/^Senha/)).toBeDisabled();
  complete();
  await screen.findByRole('status');
});
