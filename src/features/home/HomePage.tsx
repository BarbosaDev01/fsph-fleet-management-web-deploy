import { Button, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { PageHeading } from '@/shared/components/PageHeading';
import { useSession } from '@/features/auth/useSession';
import { env } from '@/shared/config/env';
import { useAccess } from '@/features/auth/access';

const modules = [
  ['/dashboard', 'Painel da frota', 'Consulte indicadores calculados a partir da API.'],
  [
    '/solicitacoes',
    'Solicitações de viagem',
    'Registre demandas e acompanhe aprovação e agendamento.',
  ],
  [
    '/atendimento-svo',
    'Atendimento e agendamento',
    'Analise solicitações e consulte a disponibilidade de alocação.',
  ],
  ['/transportes', 'Transportes', 'Solicite transportes e acompanhe o atendimento.'],
  ['/viagens', 'Viagens', 'Planeje saídas, organize paradas e registre a execução.'],
  ['/veiculos', 'Veículos', 'Consulte a frota, a quilometragem e os documentos.'],
  ['/motoristas', 'Motoristas', 'Gerencie os motoristas e o histórico de CNHs.'],
  ['/setores', 'Setores', 'Organize os setores da instituição.'],
  ['/usuarios', 'Usuários', 'Gerencie contas, perfis e situação de acesso.'],
] as const;

export function HomePage() {
  const session = useSession();
  const { canVisit } = useAccess();
  return (
    <div>
      <PageHeading
        title="Gestão de Frotas"
        description={`Olá, ${session.data?.name ?? ''}. Acesse os módulos para gerenciar a frota.`}
      />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 3 }}>
        {[
          ...modules,
          ...(env.isStaging
            ? [
                [
                  '/demonstracoes',
                  'Protótipos pendentes',
                  'Consulte as interfaces que ainda dependem de integração.',
                ],
              ]
            : []),
        ]
          .filter(([to]) => canVisit(to!))
          .map(([to, title, description]) => (
            <Paper key={to} variant="outlined" sx={{ p: 3, flex: '1 1 280px' }}>
              <Stack spacing={2}>
                <Typography component="h2" variant="h6">
                  {title}
                </Typography>
                <Typography color="text.secondary">{description}</Typography>
                <Button component={Link} to={to} sx={{ alignSelf: 'flex-start' }}>
                  Acessar {title.toLowerCase()}
                </Button>
              </Stack>
            </Paper>
          ))}
      </Stack>
    </div>
  );
}
