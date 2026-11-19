import { useFuelCardsPath } from '@/features/fuel-cards/data/useFuelCardsPath';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { FuelCardForm } from '@/features/fuel-cards/components/FuelCardForm';
import { PageHeading } from '@/shared/components/PageHeading';
import { useFuelCardsData } from './data/FuelCardsProvider';
import { Alert } from '@mui/material';

export function FuelCardCreatePage() {
  const basePath = useFuelCardsPath();
  const data = useFuelCardsData();
  if (!data?.canWrite)
    return <Alert severity="warning">Acesso restrito: seu perfil permite apenas consulta.</Alert>;
  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Stack spacing={3}>
        <Button component={Link} to={basePath} sx={{ alignSelf: 'flex-start' }}>
          Voltar à listagem
        </Button>
        <PageHeading
          title="Novo cartão"
          description="Comece com os dados do cartão. O veículo e o status podem ser definidos depois."
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.6fr) minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography component="h2" variant="h3" sx={{ fontWeight: 700, mb: 3 }}>
              Dados do cartão
            </Typography>
            <FuelCardForm />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography component="h2" variant="h3" sx={{ fontWeight: 700 }}>
              Antes de salvar
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography color="text.secondary" variant="body2">
                {data.mode === 'demo'
                  ? 'Use somente números fictícios.'
                  : 'Informe o número e o titular ou identificador do cartão. O número não poderá ser editado após o cadastro.'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {data.mode === 'demo'
                  ? 'O limite informado não define o saldo. Saldo e status começam como “Não informado”.'
                  : 'Se o saldo inicial ficar vazio, o servidor utilizará o limite total. O cartão será criado com status Ativo.'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {data.mode === 'demo'
                  ? 'O cadastro fica disponível apenas nesta demonstração, sem envio ao servidor.'
                  : 'O vínculo com o veículo poderá ser definido nos detalhes após salvar.'}
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}
