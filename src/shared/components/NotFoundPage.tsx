import { Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

import { InstitutionalPage } from '@/shared/layout/Institutional';

export function NotFoundPage() {
  return (
    <InstitutionalPage eyebrow="Erro 404" title="Página não encontrada">
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        O endereço informado não existe neste sistema.
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Voltar ao início
      </Button>
    </InstitutionalPage>
  );
}
