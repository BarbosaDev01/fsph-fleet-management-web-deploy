import { useFuelCardsPath } from '@/features/fuel-cards/data/useFuelCardsPath';
import { Alert, Button, Container, Paper, Stack } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { FuelCardForm } from '@/features/fuel-cards/components/FuelCardForm';
import { FuelCardsHeader } from '@/features/fuel-cards/components/FuelCardsHeader';
import { useFuelCardsData } from '@/features/fuel-cards/data/FuelCardsProvider';
import { useFuelCard } from './data/useFuelCard';

export function FuelCardEditPage() {
  const basePath = useFuelCardsPath();
  const { id } = useParams();
  const data = useFuelCardsData();
  const { card, error, loading } = useFuelCard(id);
  return (
    <Container component="section" maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Button component={Link} to={basePath} sx={{ alignSelf: 'flex-start' }}>
          Voltar à listagem
        </Button>
        <FuelCardsHeader
          eyebrow="Cartões / Edição"
          title="Editar cartão"
          description="Revise os dados cadastrais do cartão."
        />
        {!data?.canWrite ? (
          <Alert severity="warning">Acesso restrito: seu perfil permite apenas consulta.</Alert>
        ) : loading ? (
          <Alert severity="info" role="status">
            Carregando cartão…
          </Alert>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : card ? (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }}>
            <FuelCardForm key={card.id} card={card} />
          </Paper>
        ) : (
          <Alert severity="warning">
            {data?.mode === 'demo'
              ? 'Cartão não encontrado nesta demonstração.'
              : 'Cartão não encontrado.'}
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
