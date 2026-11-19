import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AtendimentoSvoPage } from './AtendimentoSvoPage';
import { svoApi, type SvoRequest } from './api';
import { ApiError } from '@/shared/api/result';

const access = vi.hoisted(() => ({ permissions: ['SVO_REQUESTS_READ', 'SVO_REQUESTS_MANAGE'] }));
vi.mock('@/features/auth/access', () => ({
  useAccess: () => ({
    user: { id: 'operator' },
    can: (permission: string) => access.permissions.includes(permission),
  }),
}));
const initial: SvoRequest = {
  id: 'request-1',
  protocolNumber: 'SVO-TESTE-001',
  requesterId: 'requester',
  requesterName: 'Pessoa teste',
  requesterEmail: 'test@example.invalid',
  occurredAt: '2026-11-19T10:00:00Z',
  deathLocationType: 'DOMICILE',
  address: 'Endereço de teste',
  neighborhood: 'Bairro teste',
  city: 'Cidade teste',
  contactName: 'Contato teste',
  contactPhone: '00000000',
  hasSuspectedViolence: false,
  status: 'PENDING_TRIAGE',
  createdAt: '2026-11-19T11:00:00Z',
};
let current: SvoRequest;
const page = (content: SvoRequest[], totalElements = content.length) => ({
  content,
  totalElements,
  totalPages: Math.ceil(totalElements / 20),
  number: 0,
  size: 20,
});
beforeEach(() => {
  current = { ...initial };
  access.permissions = ['SVO_REQUESTS_READ', 'SVO_REQUESTS_MANAGE'];
  vi.spyOn(svoApi, 'list').mockImplementation(async (query) =>
    query.size === 1
      ? page([current], current.status === 'PENDING_TRIAGE' ? 57 : 56)
      : page(current.status === 'PENDING_TRIAGE' ? [current] : []),
  );
  vi.spyOn(svoApi, 'mine').mockImplementation(async () => page([current]));
  vi.spyOn(svoApi, 'find').mockImplementation(async () => current);
  vi.spyOn(svoApi, 'triage').mockImplementation(async (_, approved, reason) => {
    current = { ...current, status: approved ? 'TRIAGED' : 'REJECTED', rejectionReason: reason };
    return current;
  });
});
afterEach(() => vi.restoreAllMocks());
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <AtendimentoSvoPage />
    </QueryClientProvider>,
  );
}
it('usa totalElements de pendências, aprova no servidor e atualiza detalhe, fila e contador', async () => {
  mount();
  expect(await screen.findByText('Nome do falecido')).toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: 'Resumo da operação' })).getByText('57'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Aprovar solicitação' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprovação' }));
  expect(await screen.findByText('Solicitação aprovada.')).toBeInTheDocument();
  expect(svoApi.triage).toHaveBeenCalledWith('request-1', true, '');
  expect(await screen.findByText('Nenhuma solicitação encontrada.')).toBeInTheDocument();
  expect(await screen.findByText('56')).toBeInTheDocument();
});
it('preserva justificativa na falha e só mostra sucesso após a rejeição ser confirmada', async () => {
  vi.mocked(svoApi.triage).mockRejectedValueOnce(new ApiError(500, { detail: 'Falha de teste' }));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Rejeitar solicitação' }));
  expect(screen.getByRole('button', { name: 'Confirmar rejeição' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/^Justificativa/), {
    target: { value: 'Justificativa de teste' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar rejeição' }));
  expect(await screen.findByText('Falha de teste')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Justificativa/)).toHaveValue('Justificativa de teste');
  expect(screen.queryByText('Solicitação rejeitada.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar rejeição' }));
  expect(await screen.findByText('Solicitação rejeitada.')).toBeInTheDocument();
  expect(svoApi.triage).toHaveBeenLastCalledWith('request-1', false, 'Justificativa de teste');
});
it('recarrega o estado e avisa quando outro operador já decidiu', async () => {
  vi.mocked(svoApi.triage).mockImplementation(async () => {
    current = { ...current, status: 'TRIAGED' };
    throw new ApiError(400, { detail: 'Já triada' });
  });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Aprovar solicitação' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprovação' }));
  expect(await screen.findByText(/já foi triada ou deixou/)).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.queryByText('Solicitação aprovada.')).not.toBeInTheDocument();
});
it('permite READ sem MANAGE consultar sem botões de decisão', async () => {
  access.permissions = ['SVO_REQUESTS_READ'];
  mount();
  expect(await screen.findByText('Nome do falecido')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aprovar solicitação' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rejeitar solicitação' })).not.toBeInTheDocument();
});
it('restringe WRITE sem READ às próprias solicitações e não consulta contagem global', async () => {
  access.permissions = ['SVO_REQUESTS_WRITE'];
  mount();
  expect(await screen.findByText('Nome do falecido')).toBeInTheDocument();
  expect(svoApi.mine).toHaveBeenCalled();
  expect(svoApi.list).not.toHaveBeenCalled();
});
it('bloqueia aprovação com suspeita de violência e exibe falha da API sem exemplos', async () => {
  current = { ...initial, hasSuspectedViolence: true };
  mount();
  expect(await screen.findByRole('button', { name: 'Aprovar solicitação' })).toBeDisabled();
});
it('exibe erro de consulta sem substituir a fila por dados demonstrativos', async () => {
  vi.mocked(svoApi.list).mockRejectedValue(
    new ApiError(503, { detail: 'API temporariamente indisponível' }),
  );
  mount();
  expect((await screen.findAllByText('API temporariamente indisponível')).length).toBeGreaterThan(
    0,
  );
  expect(screen.queryByRole('button', { name: 'SVO-TESTE-001' })).not.toBeInTheDocument();
});
it('exibe acesso restrito sem consultar a API quando não há permissão', () => {
  access.permissions = [];
  mount();
  expect(screen.getByRole('alert')).toHaveTextContent('Acesso restrito');
  expect(svoApi.list).not.toHaveBeenCalled();
  expect(svoApi.mine).not.toHaveBeenCalled();
});
