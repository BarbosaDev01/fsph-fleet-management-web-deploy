import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { SolicitacoesPage } from '@/features/solicitacoes/SolicitacoesPage';

function renderPage() {
  const router = createMemoryRouter([{ path: '/solicitacoes', element: <SolicitacoesPage /> }], {
    initialEntries: ['/solicitacoes'],
  });
  return render(<RouterProvider router={router} />);
}

describe('SolicitacoesPage', () => {
  it('exibe a listagem e encaminha o botão Nova solicitação ao formulário', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Solicitações' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova solicitação' })).toHaveAttribute(
      'href',
      '/solicitacoes/nova',
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Atendimento SVO' })).toHaveAttribute(
      'href',
      '/atendimento-svo',
    );
    expect(screen.getAllByRole('row')).toHaveLength(9);
  });

  it('filtra solicitações por texto, setor e status', () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar solicitação' }), {
      target: { value: 'Hospital Municipal' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('SVO-2026-0401')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar solicitação' }), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por setor' }), {
      target: { value: 'Administrativo' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByText('SVO-2026-0402')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por status' }), {
      target: { value: 'Aprovado' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('ADM-2026-0106')).toBeInTheDocument();
  });
});
