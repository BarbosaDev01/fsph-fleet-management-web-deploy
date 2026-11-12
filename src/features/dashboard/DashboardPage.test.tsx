import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { DashboardPage } from '@/features/dashboard/DashboardPage';

function renderPage() {
  const router = createMemoryRouter([{ path: '/dashboard', element: <DashboardPage /> }], {
    initialEntries: ['/dashboard'],
  });
  return render(<RouterProvider router={router} />);
}

describe('DashboardPage', () => {
  it('renderiza indicadores, filtros e os dados demonstrativos do dashboard', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Visão geral da frota' })).toBeInTheDocument();
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Triagens pendentes')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrar por setor' })).toHaveValue('all');
    expect(screen.getByRole('combobox', { name: 'Filtrar por período' })).toHaveValue('today');
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('filtra a tabela localmente por setor e período', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por setor' }), {
      target: { value: 'SVO' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByText('ADM-2026-0105')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por período' }), {
      target: { value: 'all' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('SVO-2026-0398')).toBeInTheDocument();
  });

  it('abre detalhes demonstrativos de um alerta e permite fechar o diálogo', async () => {
    renderPage();
    const alertCard = screen.getByText('Van 01 — Documentos vencidos').closest('article');
    expect(alertCard).not.toBeNull();
    fireEvent.click(within(alertCard as HTMLElement).getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('CRLV vencido 30/09/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
