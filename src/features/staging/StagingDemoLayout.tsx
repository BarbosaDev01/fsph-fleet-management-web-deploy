import { Alert, Button, Stack } from '@mui/material';
import { Link, Outlet } from 'react-router-dom';
import { env } from '@/shared/config/env';
import { NotFoundPage } from '@/shared/components/NotFoundPage';

export function StagingDemoLayout() {
  if (!env.isStaging) return <NotFoundPage />;
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Alert severity="warning">
        Protótipos pendentes: dados simulados e alterações apenas em memória. Nenhuma operação nesta
        área é persistida na instituição.
      </Alert>
      <Button component={Link} to="/demonstracoes" sx={{ alignSelf: 'flex-start' }}>
        Todos os protótipos pendentes
      </Button>
      <Outlet />
    </Stack>
  );
}
