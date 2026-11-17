import { Button, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { PageHeading } from '@/shared/components/PageHeading';

const pages = [
  [
    'cartoes-combustivel',
    'Cartões de combustível',
    'Exemplos de listagem, cadastro e vínculos para avaliação da interface. Alterações não são salvas.',
  ],
  [
    'atendimento-svo',
    'Triagem SVO',
    'Análise, complemento e equipes fictícias. Esses estados não são solicitações de viagem persistidas.',
  ],
  [
    'recuperar-senha',
    'Recuperação de senha',
    'A recuperação por e-mail aguarda implementação no backend.',
  ],
] as const;

export function StagingDemoPage() {
  return (
    <Stack spacing={3}>
      <PageHeading
        title="Protótipos pendentes"
        description="As funcionalidades incorporadas são acessadas pelos menus do sistema. Aqui permanecem apenas os recursos sem integração disponível."
      />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
        {pages.map(([path, title, description]) => (
          <Paper key={path} variant="outlined" sx={{ p: 3, flex: '1 1 260px' }}>
            <Stack spacing={2}>
              <Typography component="h2" variant="h6">
                {title}
              </Typography>
              <Typography color="text.secondary">{description}</Typography>
              <Button
                component={Link}
                to={`/demonstracoes/${path}`}
                sx={{ alignSelf: 'flex-start' }}
              >
                Consultar {title.toLowerCase()}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}
