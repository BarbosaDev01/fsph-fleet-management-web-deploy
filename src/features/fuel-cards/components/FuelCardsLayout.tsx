import { useFuelCardsPath } from '@/features/fuel-cards/data/useFuelCardsPath';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { PageHeading } from '@/shared/components/PageHeading';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useFuelCardsData } from '@/features/fuel-cards/data/FuelCardsProvider';

/** Conteúdo do módulo; largura e margens externas pertencem ao AppLayout. */
export function FuelCardsLayout() {
  const basePath = useFuelCardsPath();
  const data = useFuelCardsData();
  const { pathname } = useLocation();
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    content.current?.focus();
  }, [pathname]);
  const demo = data?.mode === 'demo';
  const ready = data?.state.status === 'ready';
  return (
    <Box
      sx={{
        minHeight: '60vh',
        minWidth: 0,
      }}
    >
      <Box
        component="a"
        href="#fuel-cards-content"
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 1600,
          bgcolor: 'background.paper',
          p: 0,
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
          '&:focus': { width: 'auto', height: 'auto', clipPath: 'none', p: 1 },
        }}
      >
        Ir para o conteúdo
      </Box>
      <Box id="fuel-cards-content" ref={content} tabIndex={-1} sx={{ outline: 'none' }}>
        {ready ? (
          <Outlet />
        ) : (
          <Box component="section">
            <Stack spacing={3}>
              {pathname !== basePath && (
                <Button component={Link} to={basePath} sx={{ alignSelf: 'flex-start' }}>
                  Voltar à listagem
                </Button>
              )}
              <PageHeading
                title="Cartões de combustível"
                description="Consulte limites, saldos e vínculos dos cartões da frota."
              />
              {data?.state.status === 'loading' ? (
                <Stack role="status" spacing={2} sx={{ alignItems: 'center', py: 4 }}>
                  <CircularProgress aria-label="Carregando cartões" />
                  <Typography>Carregando cartões e veículos.</Typography>
                </Stack>
              ) : data?.state.status === 'error' ? (
                <Alert severity="error">
                  Não foi possível carregar os cartões e veículos. {data.state.message}
                  <Box sx={{ mt: 2 }}>
                    <Button onClick={data.retry}>Tentar novamente</Button>
                  </Box>
                </Alert>
              ) : (
                <Alert severity="info" role="status">
                  Integração indisponível. Os cartões e veículos reais estarão disponíveis quando a
                  conexão com o sistema for configurada. Nenhum dado fictício está sendo exibido.
                </Alert>
              )}
            </Stack>
          </Box>
        )}
      </Box>
      <Typography
        component="footer"
        variant="caption"
        color="text.secondary"
        sx={{ mt: 3, display: 'block' }}
      >
        {demo
          ? 'Modo demonstrativo: dados fictícios, sem integração com a API. Alterações em memória; recarregar ou sair da área restaura os exemplos.'
          : 'Cartões e vínculos consultados na API. O setor do veículo não é informado no contrato de cartões.'}
      </Typography>
    </Box>
  );
}
