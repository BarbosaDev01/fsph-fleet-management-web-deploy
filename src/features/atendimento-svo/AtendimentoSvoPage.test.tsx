import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AtendimentoSvoPage } from '@/features/atendimento-svo/AtendimentoSvoPage';
import { transports } from '@/features/atendimento-svo/data/atendimentoSvoMock';

function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/demonstracoes/atendimento-svo', element: <AtendimentoSvoPage /> }],
    { initialEntries: ['/demonstracoes/atendimento-svo'] },
  );
  return render(<RouterProvider router={router} />);
}

function queue() {
  return screen.getByRole('region', { name: 'Fila de atendimento' });
}
function selectRequest(protocol: string) {
  fireEvent.click(within(queue()).getByText(protocol));
}

describe('AtendimentoSvoPage', () => {
  it('renderiza a fila, detalhes e painéis de operação', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Atendimento SVO' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fila de atendimento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Equipe de plantão' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ações da solicitação selecionada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Rotas ativas • 3 no sistema' }),
    ).toBeInTheDocument();
  });

  it('filtra localmente por texto e estado demonstrativo', async () => {
    renderPage();
    fireEvent.change(
      within(queue()).getByRole('textbox', { name: 'Buscar protocolo, coleta ou destino' }),
      { target: { value: 'Hospital Municipal' } },
    );
    expect(within(queue()).getByText('SVO-2026-0406')).toBeInTheDocument();
    expect(within(queue()).queryByText('SVO-2026-0405')).not.toBeInTheDocument();
    fireEvent.mouseDown(within(queue()).getByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Aguardando análise' }));
    expect(within(queue()).getByText('SVO-2026-0406')).toBeInTheDocument();
    expect(within(queue()).queryByText('SVO-2026-0404')).not.toBeInTheDocument();
  });

  it('aprova a solicitação selecionada, atualiza fila, detalhes, indicador e histórico e preserva ao alternar', async () => {
    renderPage();
    selectRequest('SVO-2026-0404');
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar solicitação' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Nenhum transporte, ordem, rota ou equipe será alterado.',
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar aprovação' }),
    );
    expect(within(queue()).getAllByText('Aprovada')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'SVO-2026-0404' })).toHaveTextContent('Aprovada');
    const summary = screen.getByRole('region', { name: 'Resumo da operação' });
    expect(summary.querySelectorAll('.summary-item')[0]).toHaveTextContent('2');
    expect(summary.querySelectorAll('.summary-item')[1]).toHaveTextContent('2');
    expect(transports.find((transport) => transport.id === 'tr-0404')?.status).toBe('PENDING');
    expect(screen.getByText('Solicitação aprovada')).toBeInTheDocument();
    expect(
      screen.getByText('Aprovação registrada. Nenhuma ordem ou rota foi criada.'),
    ).toBeInTheDocument();
    selectRequest('SVO-2026-0406');
    selectRequest('SVO-2026-0404');
    expect(within(queue()).getAllByText('Aprovada')).toHaveLength(2);
    fireEvent.mouseDown(within(queue()).getByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Aprovada' }));
    expect(within(queue()).getByText('SVO-2026-0404')).toBeInTheDocument();
    expect(within(queue()).queryByText('SVO-2026-0406')).not.toBeInTheDocument();
  });

  it('exige justificativa para negar e altera somente a solicitação escolhida', () => {
    renderPage();
    selectRequest('SVO-2026-0406');
    fireEvent.click(screen.getByRole('button', { name: 'Negar solicitação' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Confirmar negativa' })).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Justificativa *' }), {
      target: { value: 'Dados demonstrativos insuficientes' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar negativa' }));
    expect(within(queue()).getByText('Negada')).toBeInTheDocument();
    expect(screen.getAllByText('Negada')).toHaveLength(2);
    expect(screen.getByText('Justificativa da negativa:')).toBeInTheDocument();
    expect(within(queue()).getByText('Negada')).toBeInTheDocument();
    expect(within(queue()).getByText('SVO-2026-0404')).toBeInTheDocument();
    expect(
      screen.getByText(/Solicitação negada • Dados demonstrativos insuficientes/),
    ).toBeInTheDocument();
  });

  it('valida complemento, associa o texto, atualiza fila e preserva histórico ao alternar', () => {
    renderPage();
    selectRequest('SVO-2026-0404');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar complemento' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Enviar pedido' })).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Informação faltante *' }), {
      target: { value: 'Confirmar número do imóvel' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar pedido' }));
    expect(within(queue()).getAllByText('Aguardando complemento')).toHaveLength(2);
    expect(screen.getByText('Complemento solicitado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Complementos (1)' }));
    expect(screen.getByText('Confirmar número do imóvel')).toBeInTheDocument();
    selectRequest('SVO-2026-0405');
    selectRequest('SVO-2026-0404');
    fireEvent.click(screen.getByRole('tab', { name: 'Complementos (1)' }));
    expect(screen.getByText('Confirmar número do imóvel')).toBeInTheDocument();
  });

  it('salva análise na fonte única e mantém conteúdo após alternar solicitações; permite anexos informativos', () => {
    renderPage();
    selectRequest('SVO-2026-0406');
    const analysis = screen.getByRole('textbox', { name: 'Análise do atendente' });
    fireEvent.change(analysis, { target: { value: 'Análise local revisada para teste.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar análise' }));
    expect(screen.getByText('Análise salva no estado demonstrativo local.')).toBeInTheDocument();
    selectRequest('SVO-2026-0404');
    selectRequest('SVO-2026-0406');
    expect(screen.getByRole('textbox', { name: 'Análise do atendente' })).toHaveValue(
      'Análise local revisada para teste.',
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Anexos (0)' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Anexos não disponíveis neste protótipo.',
    );
  });
});
