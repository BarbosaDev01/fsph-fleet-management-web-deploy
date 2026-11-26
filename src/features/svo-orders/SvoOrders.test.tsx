import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SvoOrdersPage } from './SvoOrdersPage';
import { SvoOrderDetailPage } from './SvoOrderDetailPage';
import { SvoOrderReportPage } from './SvoOrderReportPage';
import { ordersApi, type SvoOrder } from './api';
import { ApiError } from '@/shared/api/result';

const access = vi.hoisted(() => ({
  role: 'EQUIPE_COLETA_SVO',
  permissions: ['SVO_ORDERS_READ', 'SVO_ORDERS_EXECUTE'],
}));
vi.mock('@/features/auth/access', () => ({
  useAccess: () => ({
    user: { id: 'test-user', role: access.role },
    can: (p: string) => access.permissions.includes(p),
  }),
}));
let current: SvoOrder;
const initial: SvoOrder = {
  id: 'order-1',
  requestId: 'request-1',
  protocolNumber: 'SVO-001',
  sectorId: 'sector-1',
  sectorName: 'SVO',
  address: 'Rua teste, Centro',
  city: 'Aracaju',
  deceasedName: null,
  driverId: 'driver-1',
  driverName: 'Motorista teste',
  teamId: 'team-1',
  teamName: 'Equipe teste',
  vehicleId: 'vehicle-1',
  vehiclePlate: 'SVO0001',
  status: 'IN_PROGRESS',
  version: 2,
  requestedAt: '2026-11-23T10:00:00Z',
  scheduledAt: '2026-11-23T10:10:00Z',
  plannedReturnAt: '2026-11-23T12:00:00Z',
  collectionDeadlineAt: null,
  startedAt: '2026-11-23T10:10:00Z',
  collectedAt: null,
  deliveredAt: null,
  deadlineStatus: 'UNDEFINED',
  requestToCollectionMinutes: null,
  collectionToDeliveryMinutes: null,
  requestToDeliveryMinutes: null,
  allowedTransitions: ['COLLECTED'],
  events: [],
};
beforeEach(() => {
  current = structuredClone(initial);
  access.role = 'EQUIPE_COLETA_SVO';
  access.permissions = ['SVO_ORDERS_READ', 'SVO_ORDERS_EXECUTE'];
  vi.spyOn(ordersApi, 'list').mockImplementation(async () => ({
    content: [current],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  }));
  vi.spyOn(ordersApi, 'find').mockImplementation(async () => current);
  vi.spyOn(ordersApi, 'transition').mockImplementation(async (_, body) => {
    current = {
      ...current,
      status: body.status,
      version: current.version + 1,
      collectedAt: '2026-11-23T10:30:00Z',
      requestToCollectionMinutes: 30,
      allowedTransitions: ['DELIVERED'],
    };
    return current;
  });
  vi.spyOn(ordersApi, 'note').mockImplementation(async (_, body) => {
    current = {
      ...current,
      version: current.version + 1,
      events: [
        ...current.events,
        {
          id: 'event-1',
          authorId: 'attendant',
          authorName: 'Atendente teste',
          type: 'NOTE',
          text: body.text,
          fromStatus: current.status,
          toStatus: current.status,
          occurredAt: '2026-11-23T10:35:00Z',
          orderVersion: current.version + 1,
        },
      ],
    };
    return current;
  });
  vi.spyOn(ordersApi, 'report').mockImplementation(async () => ({
    totalOrders: 1,
    collectionCount: 1,
    deliveryCount: 0,
    averageRequestToCollectionMinutes: 30,
    averageCollectionToDeliveryMinutes: null,
    averageRequestToDeliveryMinutes: null,
    orders: [
      {
        ...current,
        status: 'COLLECTED',
        collectedAt: '2026-11-23T10:30:00Z',
        requestToCollectionMinutes: 30,
      },
    ],
  }));
});
afterEach(() => vi.restoreAllMocks());
function mount(path = '/coletas-svo/order-1') {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/coletas-svo" element={<SvoOrdersPage />} />
          <Route path="/coletas-svo/:id" element={<SvoOrderDetailPage />} />
          <Route path="/indicadores-svo" element={<SvoOrderReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it('oferece apenas a transição retornada pela API e apresenta a ordem atualizada após a coleta', async () => {
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Registrar coleta' }));
  await waitFor(() =>
    expect(ordersApi.transition).toHaveBeenCalledWith('order-1', {
      expectedVersion: 2,
      status: 'COLLECTED',
      observation: undefined,
    }),
  );
  expect(await screen.findByRole('button', { name: 'Concluir entrega' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Registrar coleta' })).not.toBeInTheDocument();
  expect(screen.getByText('Etapa atualizada.')).toBeVisible();
  expect(screen.getByText('Sem prazo definido')).toBeVisible();
});
it('preserva o texto na falha de gravação e registra a providência com autor e horário devolvidos pelo servidor', async () => {
  access.role = 'ATENDENTE_SVO';
  access.permissions = ['SVO_ORDERS_READ', 'SVO_ORDERS_NOTES'];
  current.allowedTransitions = [];
  vi.mocked(ordersApi.note).mockRejectedValueOnce(new ApiError(503, { detail: 'Falha ao salvar' }));
  mount();
  fireEvent.change(await screen.findByLabelText('Providência ou observação'), {
    target: { value: 'Família informada' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar providência' }));
  expect(await screen.findByText('Falha ao salvar')).toBeVisible();
  expect(screen.getByLabelText('Providência ou observação')).toHaveValue('Família informada');
  fireEvent.click(screen.getByRole('button', { name: 'Registrar providência' }));
  expect(await screen.findByText('Providência registrada.')).toBeVisible();
  expect(
    within(screen.getByRole('region', { name: 'Histórico da ordem' })).getByText(
      'Família informada',
    ),
  ).toBeVisible();
  expect(screen.getByText(/Atendente teste/)).toBeVisible();
  expect(screen.getByLabelText('Providência ou observação')).toHaveValue('');
});
it('recarrega conflito sem repetir a escrita e mantém a observação para revisão', async () => {
  vi.mocked(ordersApi.transition).mockImplementationOnce(async () => {
    current = { ...current, status: 'COLLECTED', version: 3, allowedTransitions: ['DELIVERED'] };
    throw new ApiError(409, { detail: 'Versão alterada' });
  });
  mount();
  fireEvent.change(await screen.findByLabelText('Observação em campo'), {
    target: { value: 'Observação a conferir' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar coleta' }));
  expect(await screen.findByText(/Confira os dados atualizados/)).toBeVisible();
  expect(await screen.findByRole('button', { name: 'Concluir entrega' })).toBeVisible();
  expect(screen.getByLabelText('Observação em campo')).toHaveValue('Observação a conferir');
  expect(ordersApi.transition).toHaveBeenCalledTimes(1);
});
it('cobre carregamento, lista vazia e falha de consulta sem dados demonstrativos', async () => {
  vi.mocked(ordersApi.list).mockImplementationOnce(() => new Promise(() => {}));
  const mounted = mount('/coletas-svo');
  expect(screen.getByRole('progressbar')).toBeVisible();
  mounted.unmount();
  vi.mocked(ordersApi.list).mockResolvedValueOnce({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });
  const empty = mount('/coletas-svo');
  expect(await screen.findByText('Nenhuma ordem encontrada.')).toBeVisible();
  empty.unmount();
  vi.mocked(ordersApi.list).mockRejectedValueOnce(
    new ApiError(503, { detail: 'Consulta indisponível' }),
  );
  mount('/coletas-svo');
  expect(await screen.findByText('Consulta indisponível')).toBeVisible();
  expect(screen.queryByText('SVO-001')).not.toBeInTheDocument();
});
it('mostra médias independentes e transmite período, equipe e veículo como filtros do relatório', async () => {
  access.role = 'GESTOR_FROTA';
  access.permissions = ['SVO_ORDERS_READ', 'SVO_ORDERS_REPORT'];
  mount('/indicadores-svo');
  expect(await screen.findByText('Solicitação até coleta · 1 ordem')).toBeVisible();
  expect(screen.getByText('Coleta até entrega · 0 ordens')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Solicitações desde'), {
    target: { value: '2026-11-23' },
  });
  fireEvent.change(screen.getByLabelText('Solicitações até'), { target: { value: '2026-11-23' } });
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar indicadores' }));
  await waitFor(() =>
    expect(ordersApi.report).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
      expect.any(AbortSignal),
    ),
  );
  expect(await screen.findByRole('link', { name: 'SVO-001' })).toHaveAttribute(
    'href',
    '/coletas-svo/order-1',
  );
  expect(screen.getAllByText('Sem dados').length).toBeGreaterThan(1);
});
it('bloqueia consulta direta da interface sem permissão', () => {
  access.permissions = [];
  mount();
  expect(screen.getByRole('alert')).toHaveTextContent('Acesso restrito');
  expect(ordersApi.find).not.toHaveBeenCalled();
});
