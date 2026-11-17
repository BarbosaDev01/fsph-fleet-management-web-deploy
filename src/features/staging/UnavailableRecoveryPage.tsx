import { Alert, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { PageHeading } from '@/shared/components/PageHeading';

export function UnavailableRecoveryPage() {
  return (
    <Stack spacing={3}>
      <PageHeading title="Recuperação de senha" />
      <Alert severity="info">
        A recuperação por e-mail ainda não possui integração disponível. Nenhum e-mail será enviado.
        Solicite atendimento ao administrador da sua instituição.
      </Alert>
      <Button component={Link} to="/conta" sx={{ alignSelf: 'flex-start' }}>
        Alterar minha senha com a senha atual
      </Button>
    </Stack>
  );
}
