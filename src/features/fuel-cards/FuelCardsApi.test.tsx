import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FuelCardsProvider } from './data/FuelCardsProvider';
import { createApiRepository } from './data/api-repository';
import { FuelCardsLayout } from './components/FuelCardsLayout';
import { FuelCardCreatePage } from './FuelCardCreatePage';
import { FuelCardsPage } from './FuelCardsPage';
import { FuelCardDetailsPage } from './FuelCardDetailsPage';

const card = {
  id: 'outside-page',
  cardNumber: 'TESTE-0001',
  cardholderName: 'Frota teste',
  expirationDate: '2027-12-17',
  totalLimit: 100,
  availableBalance: 0,
  status: 'ACTIVE',
  vehicle: null,
};
const empty = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };
afterEach(() => vi.unstubAllGlobals());
function mount(path: string, canWrite = true) {
  const repository = createApiRepository(false);
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              path: '/cartoes-combustivel',
              element: (
                <FuelCardsProvider repository={repository} canWrite={canWrite}>
                  <FuelCardsLayout />
                </FuelCardsProvider>
              ),
              children: [
                { index: true, element: <FuelCardsPage /> },
                { path: 'novo', element: <FuelCardCreatePage /> },
                { path: ':id', element: <FuelCardDetailsPage /> },
              ],
            },
          ],
          { initialEntries: [path] },
        )}
      />
    </QueryClientProvider>,
  );
}
async function fill() {
  fireEvent.change(await screen.findByLabelText(/^Número do cartão/), {
    target: { value: 'TESTE-0001' },
  });
  fireEvent.change(screen.getByLabelText(/^Titular ou identificador/), {
    target: { value: 'Frota teste' },
  });
  fireEvent.change(screen.getByLabelText(/^Limite total/), { target: { value: '100,00' } });
  fireEvent.change(screen.getByLabelText(/^Validade/), { target: { value: '2027-12-17' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar cartão' }));
}
it('preserva o formulário quando a API recusa o cadastro e não mostra sucesso', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) =>
      request.method === 'POST'
        ? Response.json({ detail: 'Limite recusado pelo servidor' }, { status: 400 })
        : Response.json(empty),
    ),
  );
  mount('/cartoes-combustivel/novo');
  await fill();
  expect(await screen.findByText('Limite recusado pelo servidor')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Número do cartão/)).toHaveValue('TESTE-0001');
  expect(screen.getByLabelText(/^Limite total/)).toHaveValue('100,00');
  expect(screen.queryByText('Cartão cadastrado.')).not.toBeInTheDocument();
});
it('distingue gravação confirmada de falha ao atualizar a lista e não repete o POST', async () => {
  let saved = false;
  const fetch = vi.fn(async (request: Request) => {
    if (request.method === 'POST') {
      saved = true;
      return Response.json(card, { status: 201 });
    }
    return saved
      ? Response.json({ detail: 'Falha ao consultar' }, { status: 500 })
      : Response.json(empty);
  });
  vi.stubGlobal('fetch', fetch);
  mount('/cartoes-combustivel/novo');
  await fill();
  expect(
    await screen.findByText(/Operação gravada, mas não foi possível atualizar/),
  ).toBeInTheDocument();
  expect(fetch.mock.calls.filter(([request]) => request.method === 'POST')).toHaveLength(1);
  expect(
    await screen.findByRole('heading', { name: 'Cartões de combustível' }),
  ).toBeInTheDocument();
});
it('consulta detalhe por ID fora da página da lista e oculta alterações para consulta sem WRITE', async () => {
  const fetch = vi.fn(async (request: Request) =>
    Response.json(new URL(request.url).pathname.endsWith('/outside-page') ? card : empty),
  );
  vi.stubGlobal('fetch', fetch);
  mount('/cartoes-combustivel/outside-page', false);
  expect(await screen.findByText('Frota teste')).toBeInTheDocument();
  await waitFor(() =>
    expect(
      fetch.mock.calls.some(([request]) => new URL(request.url).pathname.endsWith('/outside-page')),
    ).toBe(true),
  );
  expect(screen.queryByRole('link', { name: 'Editar cartão' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Vincular veículo' })).not.toBeInTheDocument();
});
