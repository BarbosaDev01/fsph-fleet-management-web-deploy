import { useState } from 'react';
import AltRouteOutlined from '@mui/icons-material/AltRouteOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  ListItemButton,
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
import { tokens } from '@/app/theme';

type NavEntry = readonly [to: string, label: string, icon: SvgIconComponent];

const navigation: readonly { group: string; items: readonly NavEntry[] }[] = [
  {
    group: 'Visão geral',
    items: [
      ['/', 'Início', HomeOutlined],
      ['/dashboard', 'Painel da frota', DashboardOutlined],
    ],
  },
  {
    group: 'Operação',
    items: [
      ['/solicitacoes', 'Solicitações de viagem', AssignmentOutlined],
      ['/atendimento-svo', 'Atendimento e agendamento', EventNoteOutlined],
      ['/transportes', 'Transportes', DirectionsBusOutlined],
      ['/viagens', 'Rotas e viagens', AltRouteOutlined],
    ],
  },
  {
    group: 'Frota',
    items: [
      ['/veiculos', 'Veículos', DirectionsCarOutlined],
      ['/motoristas', 'Motoristas', BadgeOutlined],
    ],
  },
  {
    group: 'Administração',
    items: [
      ['/setores', 'Setores', ApartmentOutlined],
      ['/usuarios', 'Usuários', GroupOutlined],
      ['/permissoes', 'Permissões', VerifiedUserOutlined],
    ],
  },
];
const stagingGroup = {
  group: 'Homologação',
  items: [['/demonstracoes', 'Protótipos pendentes', ScienceOutlined]] as const,
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

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
            bgcolor: tokens.navy[800],
            color: tokens.navy[100],
            border: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            minHeight: 64,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderBottom: `1px solid ${tokens.navy[600]}`,
          }}
        >
          <Typography sx={{ color: 'white', fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
            FSPH
          </Typography>
          <Typography sx={{ fontSize: 12, color: tokens.navy[200] }}>Gestão de Frotas</Typography>
        </Box>
        <Box
          component="nav"
          aria-label="Navegação principal"
          sx={{ px: 1.5, py: 2, overflowY: 'auto', flex: 1 }}
        >
          {[...navigation, ...(env.isStaging ? [stagingGroup] : [])]
            .map((section) => ({
              ...section,
              items: section.items.filter(([to]) => canVisit(to)),
            }))
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <Box key={section.group} sx={{ mb: 2 }}>
                <Typography
                  component="p"
                  sx={{
                    px: 1.5,
                    mb: 0.5,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: tokens.navy[300],
                  }}
                >
                  {section.group}
                </Typography>
                {section.items.map(([to, label, Icon]) => (
                  <ListItemButton
                    key={to}
                    component={NavLink}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMenuOpen(false)}
                    sx={{
                      gap: 1.5,
                      borderRadius: 1,
                      my: 0.25,
                      px: 1.5,
                      minHeight: 40,
                      fontSize: 14,
                      fontWeight: 500,
                      color: tokens.navy[100],
                      '&:hover': { bgcolor: tokens.navy[700], color: 'white' },
                      '&.active': {
                        bgcolor: tokens.blue[800],
                        color: 'white',
                        fontWeight: 600,
                      },
                      '&.Mui-focusVisible': { outline: `2px solid ${tokens.blue[100]}` },
                    }}
                  >
                    <Icon aria-hidden sx={{ fontSize: 20 }} />
                    {label}
                  </ListItemButton>
                ))}
              </Box>
            ))}
        </Box>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: `1px solid ${tokens.navy[600]}`,
            fontSize: 12,
            lineHeight: 1.5,
            color: tokens.navy[300],
          }}
        >
          Fundação de Saúde Parreiras Horta
        </Box>
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64 }, px: { xs: 2, md: 4 } }}>
            {!desktop && (
              <IconButton
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu de navegação"
                aria-expanded={menuOpen}
                sx={{ ml: -1 }}
              >
                <MenuRounded />
              </IconButton>
            )}
            <Typography
              component={Link}
              to="/"
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 15,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Gestão de Frotas
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 13,
                  fontWeight: 700,
                  bgcolor: 'primary.main',
                }}
              >
                {initials(session.data.name)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.3, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>
                  {session.data.name}
                </Typography>
                <Typography sx={{ fontSize: 12 }} color="text.secondary">
                  {roleLabels[session.data.role]}
                </Typography>
              </Box>
            </Stack>
            <Box
              sx={{
                width: '1px',
                height: 28,
                bgcolor: 'divider',
                display: { xs: 'none', sm: 'block' },
              }}
            />
            <Button
              component={Link}
              to="/conta"
              color="inherit"
              startIcon={<PersonOutlineRounded fontSize="small" />}
              sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
            >
              Minha conta
            </Button>
            <Button
              disabled={signingOut}
              color="inherit"
              startIcon={<LogoutRounded fontSize="small" />}
              sx={{ color: 'text.secondary' }}
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
