import { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { authApi } from '@/features/auth/api';
import { useAccess } from '@/features/auth/access';
import { ModuleAccess } from '@/features/auth/ModuleAccess';
import { useSession } from '@/features/auth/useSession';
import { authToken } from '@/shared/api/auth-token';
import { roleLabels } from '@/shared/api/types';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { env } from '@/shared/config/env';

const navigation = [
  ['/', 'Início'],
  ['/dashboard', 'Painel da frota'],
  ['/solicitacoes', 'Solicitações de viagem'],
  ['/atendimento-svo', 'Atendimento e agendamento'],
  ['/veiculos', 'Veículos'],
  ['/motoristas', 'Motoristas'],
  ['/transportes', 'Transportes'],
  ['/viagens', 'Rotas e viagens'],
  ['/setores', 'Setores'],
  ['/usuarios', 'Usuários'],
  ['/permissoes', 'Permissões'],
] as const;
const drawerWidth = 248;

export function AppLayout() {
  const session = useSession();
  const { canVisit } = useAccess();
  const location = useLocation();
  const queryClient = useQueryClient();
  const desktop = useMediaQuery(useTheme().breakpoints.up('md'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>(null);
  if (!session.token)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (session.isPending) return <Loading />;
  if (session.error)
    return (
      <Container sx={{ py: 6 }}>
        <ApiFeedback
          error={session.error}
          retry={() => {
            void session.refetch();
          }}
        />
        <Button
          onClick={() => {
            authToken.clear();
            queryClient.clear();
          }}
        >
          Voltar ao login
        </Button>
      </Container>
    );
  if (!session.data) return null;
  const logout = async () => {
    setSigningOut(true);
    setLogoutError(null);
    try {
      await authApi.logout();
      await queryClient.cancelQueries();
      authToken.clear();
      queryClient.clear();
    } catch (error) {
      setLogoutError(error);
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', minWidth: 0 }}>
      <Box
        component="a"
        href="#app-content"
        sx={{
          position: 'fixed',
          left: 8,
          top: 8,
          zIndex: 1600,
          p: 1,
          bgcolor: 'background.paper',
          transform: 'translateY(-200%)',
          '&:focus': { transform: 'none' },
        }}
      >
        Ir para o conteúdo principal
      </Box>
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || menuOpen}
        onClose={() => setMenuOpen(false)}
        sx={{
          width: desktop ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
            border: 0,
          },
        }}
      >
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            FSPH
          </Typography>
          <Typography variant="body2">Gestão de Frotas</Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,.2)' }} />
        <List component="nav" aria-label="Navegação principal" sx={{ px: 1, overflowY: 'auto' }}>
          {[...navigation, ...(env.isStaging ? [['/demonstracoes', 'Protótipos pendentes']] : [])]
            .filter(([to]) => canVisit(to!))
            .map(([to, label]) => (
              <ListItemButton
                key={to}
                component={NavLink}
                to={to!}
                end={to === '/'}
                onClick={() => setMenuOpen(false)}
                sx={{
                  borderRadius: 1,
                  my: 0.25,
                  minHeight: 44,
                  '&.active': {
                    bgcolor: 'rgba(255,255,255,.18)',
                    borderLeft: '3px solid',
                    borderColor: 'secondary.light',
                  },
                }}
              >
                <ListItemText
                  primary={label}
                  slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } } }}
                />
              </ListItemButton>
            ))}
        </List>
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap', py: 1 }}>
            {!desktop && (
              <Button
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu de navegação"
                aria-expanded={menuOpen}
              >
                Menu
              </Button>
            )}
            <Typography
              component={Link}
              to="/"
              sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700, flexGrow: 1 }}
            >
              Gestão de Frotas
            </Typography>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              {session.data.name} · {roleLabels[session.data.role]}
            </Typography>
            <Button component={Link} to="/conta">
              Minha conta
            </Button>
            <Button
              disabled={signingOut}
              onClick={() => {
                void logout();
              }}
            >
              {signingOut ? 'Saindo…' : 'Sair'}
            </Button>
          </Toolbar>
        </AppBar>
        <Container
          id="app-content"
          component="main"
          tabIndex={-1}
          maxWidth="xl"
          sx={{ py: { xs: 3, md: 4 }, outline: 'none' }}
        >
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <ApiFeedback error={logoutError} />
            <ModuleAccess>
              <Outlet />
            </ModuleAccess>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
