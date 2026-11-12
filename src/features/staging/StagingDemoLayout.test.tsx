import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StagingDemoLayout } from './StagingDemoLayout';

vi.mock('@/shared/config/env', () => ({ env: { apiBaseUrl: '/api', isStaging: false } }));

it('nao disponibiliza as demonstracoes fora de staging', () => {
  render(
    <MemoryRouter>
      <StagingDemoLayout />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  expect(screen.queryByText(/Demonstração de interface/)).not.toBeInTheDocument();
});
