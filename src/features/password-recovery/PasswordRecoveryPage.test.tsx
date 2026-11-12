import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PasswordRecoveryPage } from './PasswordRecoveryPage';
import { simulatePasswordRecovery } from './mocks/password-recovery';

vi.mock('./mocks/password-recovery', () => ({ simulatePasswordRecovery: vi.fn() }));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PasswordRecoveryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(simulatePasswordRecovery).mockReset().mockResolvedValue(undefined);
});

it('valida o e-mail e confirma somente a simulação, permitindo outra solicitação', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Solicitar recuperação (demonstração)' }));
  expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
  expect(simulatePasswordRecovery).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(/^E-mail/), 'invalido');
  await user.click(screen.getByRole('button', { name: 'Solicitar recuperação (demonstração)' }));
  expect(simulatePasswordRecovery).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText(/^E-mail/));
  await user.type(screen.getByLabelText(/^E-mail/), 'maria@orgao.gov.br');
  await user.click(screen.getByRole('button', { name: 'Solicitar recuperação (demonstração)' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Simulação concluída');
  expect(
    screen.getByRole('link', { name: 'Continuar para alteração de senha (demonstração)' }),
  ).toHaveAttribute('href', '/alterar-senha?token=recuperacao-demonstrativa');
  await user.click(screen.getByRole('button', { name: 'Informar outro e-mail' }));
  expect(screen.getByLabelText(/^E-mail/)).toBeEnabled();
  expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
});

it('bloqueia envios duplicados durante o carregamento', async () => {
  let complete!: () => void;
  vi.mocked(simulatePasswordRecovery).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const user = userEvent.setup();
  renderPage();
  await user.type(screen.getByLabelText(/^E-mail/), 'maria@orgao.gov.br');
  await user.click(screen.getByRole('button', { name: 'Solicitar recuperação (demonstração)' }));
  expect(await screen.findByRole('button', { name: /Simulando solicitação/ })).toBeDisabled();
  expect(screen.getByLabelText(/^E-mail/)).toBeDisabled();
  complete();
  expect(await screen.findByRole('status')).toHaveTextContent('Simulação concluída');
});

it('mantém o e-mail após falha e permite tentar novamente', async () => {
  vi.mocked(simulatePasswordRecovery).mockRejectedValueOnce(new Error('offline'));
  const user = userEvent.setup();
  renderPage();
  await user.type(screen.getByLabelText(/^E-mail/), 'maria@orgao.gov.br');
  await user.click(screen.getByRole('button', { name: 'Solicitar recuperação (demonstração)' }));
  await screen.findByText(/Não foi possível simular/);
  expect(screen.getByLabelText(/^E-mail/)).toHaveValue('maria@orgao.gov.br');
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Simulação concluída');
  expect(simulatePasswordRecovery).toHaveBeenCalledTimes(2);
});
