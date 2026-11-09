import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { z } from 'zod';

import { simulatePasswordRecovery } from './mocks/password-recovery';
import { demoResetPath } from '@/features/password-reset/mocks/password-reset';

const schema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email('Informe um e-mail válido.').max(254, 'Use até 254 caracteres.')),
});

type Values = z.infer<typeof schema>;

export function PasswordRecoveryPage() {
  const recovery = useMutation({ mutationFn: simulatePasswordRecovery, retry: false });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });
  const busy = recovery.isPending;
  const submit = handleSubmit(() => recovery.mutate());

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Box
        component="header"
        sx={{ bgcolor: '#0f172a', color: 'white', px: { xs: 3, md: 6 }, py: 2.5 }}
      >
        <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: { xs: 32, sm: 44 }, fontWeight: 800 }}>SVO</Typography>
          <Box sx={{ borderLeft: '1px solid #334155', pl: 3 }}>
            <Typography sx={{ fontWeight: 600 }}>
              Frota administrativa • Serviço de Verificação de Óbito
            </Typography>
            <Typography variant="body2">Acesso institucional</Typography>
          </Box>
        </Stack>
      </Box>
      <Container component="main" maxWidth={false} sx={{ maxWidth: 720, py: { xs: 4, md: 7 } }}>
        <Typography color="primary" sx={{ fontWeight: 700, mb: 1 }}>
          SVO / ACESSO
        </Typography>
        <Typography component="h1" variant="h1" sx={{ color: '#0f172a', mb: 2 }}>
          Recuperar senha
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 20, mb: 3 }}>
          Informe seu e-mail institucional para solicitar a recuperação da sua senha.
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Modo demonstrativo: o envio é simulado. Nenhum e-mail será enviado, nenhum dado será
          armazenado e sua senha não será alterada.
        </Alert>
        {recovery.isSuccess ? (
          <Stack spacing={3}>
            <Alert severity="success" role="status">
              Simulação concluída. Em uma integração real, se houver uma conta vinculada ao e-mail
              informado, você receberá instruções para recuperar sua senha.
            </Alert>
            <Button variant="outlined" onClick={() => recovery.reset()}>
              Informar outro e-mail
            </Button>
            <Button component={RouterLink} to={demoResetPath} variant="contained">
              Continuar para alteração de senha (demonstração)
            </Button>
          </Stack>
        ) : (
          <Stack component="form" noValidate onSubmit={submit} spacing={3} aria-busy={busy}>
            {recovery.isError && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" disabled={busy} onClick={() => void submit()}>
                    Tentar novamente
                  </Button>
                }
              >
                Não foi possível simular a solicitação. Seu e-mail foi mantido para tentar
                novamente.
              </Alert>
            )}
            <TextField
              label="E-mail institucional"
              placeholder="nome@orgao.gov.br"
              type="email"
              autoComplete="email"
              required
              fullWidth
              disabled={busy}
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message ?? 'Use o e-mail associado à sua conta.'}
            />
            <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.8 }}>
              {busy ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Simulando solicitação…
                </>
              ) : (
                'Solicitar recuperação (demonstração)'
              )}
            </Button>
          </Stack>
        )}
        <Button component={RouterLink} to="/" sx={{ mt: 3 }}>
          Voltar ao início
        </Button>
      </Container>
    </Box>
  );
}
