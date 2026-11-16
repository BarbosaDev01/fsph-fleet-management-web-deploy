import { Alert, Button, Stack } from '@mui/material';
import { Link, Outlet } from 'react-router-dom';
import { env } from '@/shared/config/env';
import { NotFoundPage } from '@/shared/components/NotFoundPage';

export function StagingDemoLayout() {
  if (!env.isStaging) return <NotFoundPage />;
  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Alert severity="warning">
        Demonstração de interface: estas telas usam dados simulados. Cadastros e alterações aqui não
        são gravados no banco. O login e os módulos fora de /demonstracoes continuam usando a API
        real.
      </Alert>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, px: { xs: 1, md: 3 } }}>
        <Button component={Link} to="/">
          Voltar ao sistema real
        </Button>
        <Button component={Link} to="/demonstracoes">
          Todas as novas telas
        </Button>
        <Button component={Link} to="/demonstracoes/cartoes-combustivel">
          Abrir cartões
        </Button>
      </Stack>
      <Outlet />
    </Stack>
  );
}
