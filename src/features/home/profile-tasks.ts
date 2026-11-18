import type { UserRole } from '@/shared/api/types';

// Profiles choose the order and wording. Session permissions authorize every link.
export const profileTasks: Record<
  UserRole,
  { title: string; description: string; priorities: string[] }
> = {
  ADMIN: {
    title: 'Administração de usuários e acessos',
    description: 'Cadastre pessoas, confira seus perfis e mantenha as permissões da equipe.',
    priorities: ['/usuarios/novo', '/usuarios', '/permissoes', '/dashboard'],
  },
  EMPLOYEE: {
    title: 'Suas solicitações de viagem',
    description:
      'Solicite uma viagem institucional e acompanhe a análise e o agendamento das suas demandas.',
    priorities: ['/solicitacoes/nova', '/solicitacoes', '/transportes'],
  },
  GESTOR_FROTA: {
    title: 'Análise e organização da frota',
    description:
      'Analise as solicitações, confira a disponibilidade e defina o veículo e o condutor de cada viagem.',
    priorities: ['/atendimento-svo', '/viagens', '/veiculos', '/motoristas'],
  },
  MOTORISTA: {
    title: 'Suas viagens atribuídas',
    description:
      'Confira o veículo e as paradas de cada viagem atribuída a você. O veículo é definido por viagem; não há veículo fixo.',
    priorities: ['/viagens'],
  },
  ATENDENTE_SVO: {
    title: 'Atendimento SVO',
    description: 'Consulte abaixo as atividades habilitadas para sua conta de atendimento.',
    priorities: ['/transportes', '/solicitacoes', '/setores'],
  },
  GESTOR_SVO: {
    title: 'Gestão SVO',
    description: 'Consulte abaixo as atividades habilitadas para sua conta de gestão do SVO.',
    priorities: ['/atendimento-svo', '/transportes', '/viagens', '/setores'],
  },
  EQUIPE_COLETA_SVO: {
    title: 'Equipe de coleta SVO',
    description: 'Consulte abaixo as atividades habilitadas para sua conta da equipe de coleta.',
    priorities: ['/viagens', '/transportes', '/setores'],
  },
};
