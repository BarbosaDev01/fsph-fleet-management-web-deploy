export type Vehicle = {
  id: number;
  plate: string;
  model: string;
  category: string;
  driver: string;
  status: 'Ativo' | 'Manutenção' | 'Inativo';
};

export type Driver = {
  id: number;
  name: string;
  license: string;
  sector: string;
  status: 'Disponível' | 'Em rota';
};
