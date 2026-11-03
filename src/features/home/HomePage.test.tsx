import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '@/app/providers/AppProviders';
import { HomePage } from './HomePage';

function setup() {
  const user = userEvent.setup();
  render(
    <AppProviders>
      <HomePage />
    </AppProviders>,
  );
  return user;
}

// Multiple MUI transitions and user interactions need headroom on Windows runners.
describe('Motoristas e Veículos', { timeout: 15_000 }, () => {
  it('combina busca, setor e status e limpa todos os filtros', async () => {
    const user = setup();
    await user.click(screen.getByRole('tab', { name: 'Motoristas' }));
    await user.click(screen.getByRole('combobox', { name: 'Setor' }));
    await user.click(screen.getByRole('option', { name: 'Operações' }));
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(screen.getByRole('option', { name: 'Disponível' }));
    await user.type(screen.getByRole('textbox', { name: 'Pesquisar' }), 'Carlos');
    expect(screen.getByText('Carlos Lima')).toBeVisible();
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Pesquisar' }), 'inexistente');
    expect(screen.getByText('Nenhum resultado para os filtros selecionados.')).toBeVisible();
    expect(
      screen.getByText('Nenhum resultado para os filtros selecionados.').closest('td'),
    ).toHaveAttribute('colspan', '4');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByRole('textbox', { name: 'Pesquisar' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Setor' })).toHaveTextContent('Todos');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Todos');
    expect(screen.getByText('Maria Santos')).toBeVisible();
  });

  it('mostra os detalhes do veículo selecionado e permite fechar', async () => {
    const user = setup();
    for (const [plate, model] of [
      ['ABC-1D23', 'Fiat Argo'],
      ['DEF-4G56', 'Chevrolet Onix'],
    ]) {
      await user.click(screen.getByRole('button', { name: `Detalhes do veículo ${plate}` }));
      const dialog = screen.getByRole('dialog', { name: 'Detalhes do veículo' });
      expect(within(dialog).getByText(`Placa: ${plate}`)).toBeVisible();
      expect(within(dialog).getByText(`Modelo: ${model}`)).toBeVisible();
      await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
  });

  it('valida espaços e duplicidade antes de cadastrar veículo', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /cadastrar veículo/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Placa', { exact: false }), '   ');
    await user.type(within(dialog).getByLabelText('Modelo', { exact: false }), '   ');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findAllByText('Preencha este campo.')).toHaveLength(2);
    await user.clear(within(dialog).getByLabelText('Placa', { exact: false }));
    await user.type(within(dialog).getByLabelText('Placa', { exact: false }), 'abc-1d23');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText('Já existe um veículo com essa placa.')).toBeVisible();
    await user.clear(within(dialog).getByLabelText('Placa', { exact: false }));
    await user.type(within(dialog).getByLabelText('Placa', { exact: false }), ' xyz-9a12 ');
    await user.clear(within(dialog).getByLabelText('Modelo', { exact: false }));
    await user.type(within(dialog).getByLabelText('Modelo', { exact: false }), ' Novo modelo ');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('XYZ-9A12')).toBeVisible();
    expect(screen.getByText('Novo modelo')).toBeVisible();
  });

  it('valida os campos e habilitação duplicada do motorista', async () => {
    const user = setup();
    await user.click(screen.getByRole('tab', { name: 'Motoristas' }));
    await user.click(screen.getByRole('button', { name: /cadastrar motorista/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findAllByText('Preencha este campo.')).toHaveLength(3);
    await user.type(within(dialog).getByLabelText(/Nome completo/), ' Ana Teste ');
    await user.type(within(dialog).getByLabelText(/Número da habilitação/), '12345678901');
    await user.type(within(dialog).getByLabelText(/Setor/), ' Operações ');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(dialog).findByText('Já existe um motorista com essa habilitação.'),
    ).toBeVisible();
    await user.clear(within(dialog).getByLabelText(/Número da habilitação/));
    await user.type(within(dialog).getByLabelText(/Número da habilitação/), '99999999999');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Ana Teste')).toBeVisible();
  });

  it('simula carregamento, erro e lista vazia sem apagar cadastros', async () => {
    const user = setup();
    async function select(name: string) {
      await user.click(screen.getByRole('combobox', { name: 'Estado demonstrativo' }));
      await user.click(screen.getByRole('option', { name }));
    }
    await select('Carregamento');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando dados demonstrativos');
    await select('Erro');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nova tentativa demonstrativa concluída.')).toBeVisible();
    await select('Lista vazia');
    expect(screen.getByText('Nenhum cadastro nesta lista demonstrativa.')).toBeVisible();
    expect(screen.getByText('ABC-1D23')).toBeVisible();
    await select('Desativado');
    expect(
      screen.queryByText('Nenhum cadastro nesta lista demonstrativa.'),
    ).not.toBeInTheDocument();
  });
});
