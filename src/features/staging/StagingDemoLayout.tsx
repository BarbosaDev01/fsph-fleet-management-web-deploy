import { Alert, Button, Stack } from '@mui/material';
import { Link, Outlet } from 'react-router-dom';
import { env } from '@/shared/config/env';
import { NotFoundPage } from '@/shared/components/NotFoundPage';

export function StagingDemoLayout() {
  if (!env.isStaging) return <NotFoundPage />;
  return (
    <Stack spacing={2}>
      <Alert severity="warning">
        Demonstração de interface: estas telas usam dados simulados. Cadastros e alterações aqui não
        são gravados no banco. O login e os módulos fora de /demonstracoes continuam usando a API
        real.
      </Alert>
      <Stack direction="row" spacing={2}>
        <Button component={Link} to="/">
          Voltar ao sistema real
        </Button>
        <Button component={Link} to="/demonstracoes">
          Todas as novas telas
        </Button>
      </Stack>
      <Outlet />
    </Stack>
  );
}
