export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  sector: string;
  lastAccess: string;
  active: boolean;
};

export type Directory = {
  users: User[];
  profiles: { name: string; sector: string; description: string }[];
  audit: {
    id: string;
    author: string;
    date: string;
    action: string;
    success: boolean;
    detail: string;
  }[];
};

// Isolated fixtures. These records do not represent accounts or actual access rules.
export const demoDirectory: Directory = {
  users: [
    {
      id: '1',
      name: 'Ana Coordenadora',
      email: 'ana.coord@example.com',
      role: 'Coordenador',
      sector: 'Administração',
      lastAccess: '2026-11-04T14:15:00-03:00',
      active: true,
    },
    {
      id: '2',
      name: 'Luiz Administrador',
      email: 'luiz.admin@example.com',
      role: 'Administrador',
      sector: 'Administração',
      lastAccess: '2026-11-04T09:30:00-03:00',
      active: true,
    },
    {
      id: '3',
      name: 'Clara Operações',
      email: 'clara.op@example.com',
      role: 'Coordenador',
      sector: 'Serviço de Verificação de Óbito',
      lastAccess: '2026-11-04T13:40:00-03:00',
      active: true,
    },
    {
      id: '4',
      name: 'Luiz Logística',
      email: 'luiz.log@example.com',
      role: 'Coordenador',
      sector: 'Transportes',
      lastAccess: '2026-11-04T13:50:00-03:00',
      active: true,
    },
    {
      id: '5',
      name: 'Carlos Silva',
      email: 'c.silva@example.com',
      role: 'Motorista',
      sector: 'Serviço de Verificação de Óbito',
      lastAccess: '2026-11-04T14:00:00-03:00',
      active: true,
    },
    {
      id: '6',
      name: 'Pedro Almeida',
      email: 'p.almeida@example.com',
      role: 'Motorista',
      sector: 'Transportes',
      lastAccess: '2026-06-05T17:10:00-03:00',
      active: false,
    },
  ],
  profiles: [
    {
      name: 'Administrador',
      sector: 'Administração',
      description:
        'Exemplo de gestão de contas e acesso. Permissões reais pendentes de contrato da API.',
    },
    {
      name: 'Coordenador',
      sector: 'Administração / SVO / Transportes',
      description:
        'Exemplo de coordenação por setor. Permissões reais pendentes de contrato da API.',
    },
    {
      name: 'Motorista',
      sector: 'SVO / Transportes',
      description:
        'Exemplo de consulta às próprias rotas. Permissões reais pendentes de contrato da API.',
    },
  ],
  audit: [
    {
      id: '1',
      author: 'Luiz Administrador',
      date: '2026-11-04T14:20:00-03:00',
      action: 'Gestão de conta',
      success: true,
      detail: 'Evento fictício de atualização de conta.',
    },
    {
      id: '2',
      author: 'Clara Operações',
      date: '2026-11-04T13:40:00-03:00',
      action: 'Consulta de usuários',
      success: true,
      detail: 'Evento fictício de consulta por setor.',
    },
    {
      id: '3',
      author: 'Luiz Logística',
      date: '2026-11-04T13:50:00-03:00',
      action: 'Consulta de rotas',
      success: true,
      detail: 'Evento fictício de consulta de rota.',
    },
    {
      id: '4',
      author: 'Luiz Administrador',
      date: '2026-06-05T17:10:00-03:00',
      action: 'Acesso bloqueado',
      success: false,
      detail: 'Exemplo fictício de conta inativa.',
    },
  ],
};

export async function loadDemoDirectory(): Promise<Directory> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return demoDirectory;
}
