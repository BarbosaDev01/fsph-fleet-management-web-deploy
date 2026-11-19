import { createApiRepository } from './api-repository';
import { authToken } from '@/shared/api/auth-token';

const card = {
  id: 'card-id',
  cardNumber: 'TESTE-0042',
  cardholderName: 'Frota teste',
  expirationDate: '2027-04-17',
  totalLimit: 0,
  availableBalance: 0,
  status: 'ACTIVE',
  vehicle: null,
  notes: 'Preservar',
};
const values = {
  number: 'TESTE-0042',
  cardholderName: 'Frota teste',
  validity: '2027-04-17',
  limit: '1500,20',
  availableBalance: '0',
  notes: 'Preservar',
};
afterEach(() => {
  vi.unstubAllGlobals();
  authToken.clear();
});
it('usa o JWT, filtros e paginação flat do Spring e preserva zero e a data civil', async () => {
  const requests: Request[] = [];
  authToken.set('test-jwt');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      requests.push(request);
      return Response.json({
        content: [card],
        totalElements: 41,
        totalPages: 3,
        number: 1,
        size: 20,
      });
    }),
  );
  const snapshot = await createApiRepository(false).load({
    page: 1,
    search: 'TESTE',
    status: 'Ativo',
    vehicleId: 'vehicle-id',
  });
  const url = new URL(requests[0]!.url);
  expect(url.pathname).toBe('/api/v1/fuel-cards');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    page: '1',
    size: '20',
    search: 'TESTE',
    status: 'ACTIVE',
    vehicleId: 'vehicle-id',
  });
  expect(requests[0]!.headers.get('Authorization')).toBe('Bearer test-jwt');
  expect(snapshot).toMatchObject({
    totalElements: 41,
    totalPages: 3,
    cards: [
      {
        availableBalance: 0,
        totalLimit: 0,
        expirationDate: '2027-04-17',
        validity: '17/04/2027',
        status: 'Ativo',
      },
    ],
  });
});
it('envia somente campos aceitos, usa GET de detalhe e DELETE somente no vínculo', async () => {
  const requests: { method: string; path: string; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      requests.push({
        method: request.method,
        path: new URL(request.url).pathname,
        body:
          request.method === 'GET' || request.method === 'DELETE'
            ? undefined
            : await request.json(),
      });
      return Response.json(card);
    }),
  );
  const repository = createApiRepository(false);
  await repository.findCard!('card-id');
  await repository.createCard(values);
  await repository.editCard('card-id', values);
  await repository.linkVehicle('card-id', 'vehicle-id');
  await repository.unlinkVehicle('card-id');
  await repository.changeStatus('card-id', 'Bloqueado');
  expect(requests).toEqual([
    { method: 'GET', path: '/api/v1/fuel-cards/card-id' },
    {
      method: 'POST',
      path: '/api/v1/fuel-cards',
      body: {
        cardNumber: 'TESTE-0042',
        cardholderName: 'Frota teste',
        expirationDate: '2027-04-17',
        totalLimit: 1500.2,
        availableBalance: 0,
        notes: 'Preservar',
      },
    },
    {
      method: 'PUT',
      path: '/api/v1/fuel-cards/card-id',
      body: {
        cardholderName: 'Frota teste',
        expirationDate: '2027-04-17',
        totalLimit: 1500.2,
        availableBalance: 0,
        notes: 'Preservar',
      },
    },
    {
      method: 'POST',
      path: '/api/v1/fuel-cards/card-id/bind-vehicle',
      body: { vehicleId: 'vehicle-id' },
    },
    { method: 'DELETE', path: '/api/v1/fuel-cards/card-id/bind-vehicle' },
    { method: 'PATCH', path: '/api/v1/fuel-cards/card-id/status', body: { status: 'BLOCKED' } },
  ]);
});
it('não substitui falhas por exemplos e valida valores sem arredondar silenciosamente', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ detail: 'Acesso negado' }, { status: 403 })),
  );
  const repository = createApiRepository(false);
  await expect(repository.load()).rejects.toMatchObject({ status: 403 });
  expect(repository.formSchema.safeParse({ ...values, limit: '1,001' }).success).toBe(false);
  expect(repository.formSchema.safeParse({ ...values, validity: '2027-02-30' }).success).toBe(
    false,
  );
});
