import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { NovaSolicitacaoPage } from '@/features/nova-solicitacao/NovaSolicitacaoPage';
import {
  initialFormValues,
  toDemoSubmission,
  toDemoTransport,
} from '@/features/nova-solicitacao/data/novaSolicitacaoMock';

function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/solicitacoes/nova', element: <NovaSolicitacaoPage /> }],
    { initialEntries: ['/solicitacoes/nova'] },
  );
  return render(<RouterProvider router={router} />);
}

async function choose(label: RegExp, option: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

describe('NovaSolicitacaoPage', () => {
  it('renderiza o formulário simplificado com sidebar, dados e sem painéis demonstrativos', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Nova solicitação' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitações' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Ana Coordenadora')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Origem *' })).toHaveValue('Sede FSPH');
    expect(screen.getByRole('combobox', { name: 'Quantidade de passageiros *' })).toHaveTextContent(
      '3 pessoas',
    );
    expect(screen.getByRole('radio', { name: 'Adicionar a uma rota existente' })).toBeChecked();
    for (const removedHeading of [
      'Fluxo conforme setor',
      'Regras de bloqueio',
      'Recursos disponíveis',
    ]) {
      expect(
        screen.queryByRole('heading', { name: new RegExp(removedHeading) }),
      ).not.toBeInTheDocument();
    }
    expect(screen.queryByText('Rascunho demonstrativo')).not.toBeInTheDocument();
    expect(screen.queryByText(/Esta seleção é demonstrativa/)).not.toBeInTheDocument();
  });

  it.each(['1 pessoa', '2 pessoas', '3 pessoas', '4 pessoas'])(
    'permite selecionar %s sem campo de digitação livre',
    async (option) => {
      renderPage();
      await choose(/Quantidade de passageiros/, option);
      expect(
        screen.getByRole('combobox', { name: 'Quantidade de passageiros *' }),
      ).toHaveTextContent(option);
    },
  );

  it('exige quantidade de passageiros depois de limpar o formulário', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar / limpar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para aprovação' }));
    expect(screen.getByText('Selecione a quantidade de passageiros.')).toBeInTheDocument();
    expect(screen.getByText('Revise os campos obrigatórios destacados.')).toBeInTheDocument();
  });

  it('limpa o formulário e permite enviar novamente, mantendo registros apenas em memória', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para aprovação' }));
    expect(screen.getByText(/Solicitação demonstrativa 000001 enviada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar / limpar' }));
    expect(screen.getByRole('textbox', { name: 'Origem *' })).toHaveValue('');
    expect(
      screen.getByRole('combobox', { name: 'Quantidade de passageiros *' }).textContent,
    ).toMatch(/^\u200b?$/);
    expect(screen.getByText('Formulário limpo.')).toBeInTheDocument();
  });

  it('mantém escolhas de campos, rota e quantidade enquanto o formulário é editado', async () => {
    renderPage();
    await choose(/Tipo de solicitação/, 'Transporte de passageiros');
    await choose(/Setor da demanda/, 'SVO');
    await choose(/Quantidade de passageiros/, '4 pessoas');
    fireEvent.click(screen.getByRole('radio', { name: 'Criar uma nova rota' }));
    expect(screen.getByRole('radio', { name: 'Criar uma nova rota' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Quantidade de passageiros *' })).toHaveTextContent(
      '4 pessoas',
    );
    expect(screen.getByText('Transporte de passageiros')).toBeInTheDocument();
  });

  it('envia simulação com quantidade no metadado de interface, separada de TRANSPORTS', () => {
    const submission = toDemoSubmission(
      { ...initialFormValues, passengerCount: 4 },
      '00000000-0000-4000-8000-000000000001',
    );
    expect(submission.presentation.passengerCount).toBe(4);
    expect(submission.transport.status).toBe('PENDING');
    expect(submission.transport).not.toHaveProperty('passengerCount');
    expect(submission.transport).not.toHaveProperty('passengerOccupancy');
    expect(submission.transport).not.toHaveProperty('routeChoice');
    expect(toDemoTransport(initialFormValues, submission.transport.id)).toEqual(
      submission.transport,
    );
  });
});
