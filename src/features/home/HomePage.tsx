import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { PageHeading } from '@/shared/components/PageHeading';
import { useAccess } from '@/features/auth/access';
import { roleLabels } from '@/shared/api/types';
import { profileTasks } from './profile-tasks';

const modules = [
  ['/coletas-svo', 'Coletas SVO', 'Acompanhe etapas, prazos e providências das ordens de coleta.'],
  [
    '/indicadores-svo',
    'Indicadores SVO',
    'Consulte os tempos reais de solicitação, coleta e entrega.',
  ],
  ['/usuarios/novo', 'Novo usuário', 'Cadastre nome, e-mail, senha, setor e perfil de acesso.'],
  ['/permissoes', 'Permissões', 'Confira as ações concedidas a cada perfil.'],
  [
    '/solicitacoes/nova',
    'Solicitar viagem',
    'Informe período, origem, destino, finalidade e passageiros.',
  ],
  ['/dashboard', 'Painel da frota', 'Consulte os indicadores disponíveis para sua conta.'],
  [
    '/solicitacoes',
    'Solicitações de viagem',
    'Registre demandas e acompanhe aprovação e agendamento.',
  ],
  [
    '/analise-viagens',
    'Análise e agendamento',
    'Consulte demandas institucionais e, quando autorizado, aprove e defina veículo e condutor.',
  ],
  [
    '/atendimento-svo',
    'Triagem SVO',
    'Consulte as ocorrências e registre a decisão de triagem quando autorizado.',
  ],
  [
    '/cartoes-combustivel',
    'Cartões de combustível',
    'Consulte limites, saldos e vínculos dos cartões da frota.',
  ],
  ['/transportes', 'Transportes', 'Solicite transportes e acompanhe o atendimento.'],
  ['/viagens', 'Viagens', 'Consulte o veículo, o condutor e as paradas de cada viagem.'],
  ['/veiculos', 'Veículos', 'Consulte a frota, a quilometragem e os documentos.'],
  ['/motoristas', 'Motoristas', 'Consulte os motoristas e o histórico de CNHs.'],
  ['/setores', 'Setores', 'Consulte os setores da instituição.'],
  ['/usuarios', 'Usuários', 'Consulte contas, perfis e situação de acesso.'],
] as const;

export function HomePage() {
  const { can, canVisit, user } = useAccess();
  if (!user) return null;
  const profile = profileTasks[user.role];
  const visible = modules
    .filter(([to]) => canVisit(to))
    .sort(([a], [b]) => {
      const rank = (path: string) => {
        const index = profile.priorities.indexOf(path);
        return index < 0 ? profile.priorities.length : index;
      };
      return rank(a) - rank(b);
    });
  const primary = visible.find(([to]) => profile.priorities.includes(to));
  const svoWithoutActivities =
    ['ATENDENTE_SVO', 'GESTOR_SVO', 'EQUIPE_COLETA_SVO'].includes(user.role) &&
    !visible.some(([to]) =>
      ['/solicitacoes', '/transportes', '/viagens', '/atendimento-svo', '/coletas-svo'].includes(
        to,
      ),
    );
  return (
    <Stack spacing={3}>
      <PageHeading
        title="Gestão de Frotas"
        description={`Olá, ${user.name}. Confira suas atividades e os módulos disponíveis.`}
      />
      <Paper
        variant="outlined"
        sx={{ p: { xs: 2, md: 3 }, borderLeft: 4, borderLeftColor: 'primary.main' }}
      >
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Chip label={roleLabels[user.role]} size="small" color="primary" variant="outlined" />
          <Typography component="h2" variant="h3">
            {profile.title}
          </Typography>
          <Typography color="text.secondary">
            {primary
              ? profile.description
              : 'Consulte abaixo os módulos habilitados pelas permissões da sua conta.'}
          </Typography>
          {primary && !svoWithoutActivities && (
            <Button component={Link} to={primary[0]} variant="contained">
              {primary[0] === '/viagens' && !can('ROUTES_MANAGE') ? 'Minhas viagens' : primary[1]}
            </Button>
          )}
          {svoWithoutActivities && (
            <Alert severity="info">
              Nenhuma atividade de atendimento ou coleta foi habilitada para sua conta. Consulte a
              administração para orientação.
            </Alert>
          )}
          <Button component={Link} to="/conta" size="small">
            Consultar minha conta
          </Button>
        </Stack>
      </Paper>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
        {visible.map(([to, title, description]) => (
          <Paper
            key={to}
            variant="outlined"
            sx={{ p: 2.5, flex: '1 1 280px', display: 'flex', flexDirection: 'column' }}
          >
            <Typography component="h2" variant="h3">
              {to === '/viagens' && !can('ROUTES_MANAGE') ? 'Minhas viagens' : title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, flex: 1 }}>
              {to === '/viagens' && !can('ROUTES_MANAGE')
                ? 'Veja somente as viagens atribuídas a você e o veículo definido para cada saída.'
                : description}
            </Typography>
            <Button
              component={Link}
              to={to}
              variant="outlined"
              size="small"
              sx={{ alignSelf: 'flex-start', mt: 2 }}
            >
              Acessar {title.toLowerCase()}
            </Button>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}
