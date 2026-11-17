import type { ReactNode } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useAccess } from './access';

export function ModuleAccess({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { canVisit } = useAccess();
  if (canVisit(pathname)) return children;
  return (
    <Stack spacing={2}>
      <Alert severity="warning" role="alert">
        Acesso restrito. Sua conta não tem permissão para consultar este módulo.
      </Alert>
      <Button component={Link} to="/" sx={{ alignSelf: 'flex-start' }}>
        Voltar ao início
      </Button>
    </Stack>
  );
}
