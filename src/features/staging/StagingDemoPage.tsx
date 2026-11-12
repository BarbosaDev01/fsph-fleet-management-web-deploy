import { Button, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const pages = [
  ['frota/motoristas', 'Motoristas e cadastro demonstrativo'],
  ['frota/veiculos', 'Veículos e cadastro demonstrativo'],
  ['dashboard', 'Dashboard SVO'],
  ['atendimento-svo', 'Atendimento SVO e agendamento'],
  ['solicitacoes', 'Solicitações SVO'],
  ['solicitacoes/nova', 'Nova solicitação SVO'],
  ['cadastro-usuarios', 'Cadastro de usuários SVO'],
  ['dashboard-usuarios', 'Dashboard de usuários'],
  ['diretorio', 'Diretório de usuários'],
  ['login', 'Layout de login demonstrativo'],
  ['cadastro', 'Layout de cadastro institucional'],
  ['recuperar-senha', 'Layout de recuperação de senha'],
  ['alterar-senha', 'Layout de alteração de senha'],
] as const;

export function StagingDemoPage() {
  return (
    <Stack component="main" spacing={3}>
      <Typography component="h1" variant="h3">
        Novas telas integradas
      </Typography>
      <Typography>
        As três branches da equipe estão disponíveis sem substituir a autenticação JWT ou os
        cadastros reais. As interfaces demonstrativas permanecem separadas e identificadas.
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
        {pages.map(([path, title]) => (
          <Paper key={path} variant="outlined" sx={{ p: 2, flex: '1 1 260px' }}>
            <Button component={Link} to={`/demonstracoes/${path}`}>
              {title}
            </Button>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}
