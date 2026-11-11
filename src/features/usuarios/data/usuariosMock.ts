export const accessProfiles = [
  {
    name: 'Administrador',
    title: 'Administrador / Gestor: distintos',
    description:
      'Admin gerencia contas. Gestor aprova somente Administrativo, sem gestão de usuários.',
    destination: 'Dashboard',
    actions: ['Gestor: aprovar ADM', 'Admin: gerenciar contas', 'Monitorar rotas'],
    tone: 'blue',
  },
  {
    name: 'Atendente',
    title: 'Atendente',
    description:
      'SVO: salva análise, pede complemento, aprova e gera OS ou nega com justificativa.',
    destination: 'Triagem',
    actions: ['Registrar solicitações', 'Aprovar SVO e gerar OS', 'Negar com justificativa'],
    tone: 'green',
  },
  {
    name: 'Logística',
    title: 'Logística',
    description: 'Alocar somente OS aprovada; SVO sem segunda aprovação.',
    destination: 'Alocar',
    actions: ['Alocar veículos e motoristas', 'Gerenciar rotas', 'Monitorar execução'],
    tone: 'blue',
  },
  {
    name: 'Motorista',
    title: 'Motorista',
    description: 'Acesso restrito às suas rotas, início, atualização e conclusão.',
    destination: 'Minhas rotas',
    actions: [
      'Iniciar rota',
      'Atualizar status',
      'Concluir rota',
      'Registrar ocorrências e abastecimento',
    ],
    tone: 'green',
  },
] as const;

export type UserFormValues = {
  name: string;
  email: string;
  profile: string;
  password: string;
  sector: string;
  license: string;
  licenseExpiresAt: string;
  status: string;
};

export const emptyUserValues: UserFormValues = {
  name: '',
  email: '',
  profile: 'Motorista',
  password: '',
  sector: 'SVO',
  license: '',
  licenseExpiresAt: '',
  status: 'Ativa',
};
