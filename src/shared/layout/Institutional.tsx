import LockOutlined from '@mui/icons-material/LockOutlined';
import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { tokens } from '@/app/theme';

export function InstitutionalHeader() {
  return (
    <Box
      component="header"
      sx={{
        bgcolor: tokens.navy[800],
        color: 'white',
        borderBottom: `3px solid ${tokens.blue[800]}`,
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: { xs: 2, sm: 3 },
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 4 },
          minHeight: { xs: 64, sm: 76 },
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, sm: 26 }, letterSpacing: '0.02em' }}>
          FSPH
        </Typography>
        <Box sx={{ width: '1px', alignSelf: 'stretch', my: 2, bgcolor: tokens.navy[600] }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: { xs: 13, sm: 14 }, lineHeight: 1.35 }}>
            Gestão de Frotas
          </Typography>
          <Typography sx={{ fontSize: 12, color: tokens.navy[200] }}>
            Fundação de Saúde Parreiras Horta
          </Typography>
        </Box>
        <Stack
          direction="row"
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 0.75,
            fontSize: 12,
            color: tokens.navy[200],
          }}
        >
          <LockOutlined aria-hidden sx={{ fontSize: 16 }} />
          Acesso institucional
        </Stack>
      </Stack>
    </Box>
  );
}

export function InstitutionalFooter() {
  return (
    <Box
      component="footer"
      sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          gap: 0.5,
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 4 },
          py: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} FSPH — Fundação de Saúde Parreiras Horta
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Gestão de Frotas • Frota administrativa e Serviço de Verificação de Óbito
        </Typography>
      </Stack>
    </Box>
  );
}

/** Página pública (login, erros): cabeçalho institucional, cartão central e rodapé. */
export function InstitutionalPage({
  eyebrow,
  title,
  description,
  width = 460,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  width?: number;
  children: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <InstitutionalHeader />
      <Box
        component="main"
        sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: 2, py: { xs: 3, sm: 7 } }}
      >
        <Paper
          variant="outlined"
          sx={{
            width: '100%',
            maxWidth: width,
            alignSelf: 'flex-start',
            p: { xs: 2.5, sm: 4 },
            borderColor: tokens.border.strong,
          }}
        >
          <Typography variant="overline" color="primary" component="p" sx={{ fontSize: 11 }}>
            {eyebrow}
          </Typography>
          <Typography component="h1" variant="h1">
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 1, fontSize: 14, lineHeight: 1.6 }}>
              {description}
            </Typography>
          )}
          <Box sx={{ mt: 3 }}>{children}</Box>
        </Paper>
      </Box>
      <InstitutionalFooter />
    </Box>
  );
}
