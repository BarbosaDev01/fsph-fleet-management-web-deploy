import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import {
  demoResetToken,
  loadDemoResetContext,
  simulatePasswordReset,
} from './mocks/password-reset';

const schema = z.object({
  password: z.string().min(8, 'Use pelo menos 8 caracteres.').max(128, 'Use até 128 caracteres.'),
});
type Values = z.infer<typeof schema>;

export function PasswordResetPage() {
  const [params] = useSearchParams();
  // Real recovery links cannot be validated until the API contract is available.
  const demo = params.get('token') === demoResetToken;
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Box
        component="header"
        sx={{ bgcolor: '#0f172a', color: 'white', px: { xs: 3, md: 6 }, py: { xs: 2.5, md: 4 } }}
      >
        <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: { xs: 32, sm: 48 }, fontWeight: 800 }}>SVO</Typography>
          <Box sx={{ borderLeft: '1px solid #334155', pl: 3 }}>
            <Typography sx={{ fontWeight: 600, fontSize: { xs: 14, sm: 20 } }}>
              Frota administrativa • Serviço de Verificação de Óbito
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, sm: 18 }, color: '#cbd5e1' }}>
              Acesso institucional
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Container component="main" maxWidth={false} sx={{ maxWidth: 704, py: { xs: 4, md: 9 } }}>
        <Typography color="primary" sx={{ fontWeight: 700, mb: 1 }}>
          SVO / ACESSO
        </Typography>
        <Typography component="h1" variant="h1" sx={{ color: '#0f172a', mb: 2 }}>
          Alterar Senha
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: 18, sm: 22 }, mb: 4 }}>
          Altere sua senha.
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Modo demonstrativo: a API de alteração de senha ainda não está integrada. Nenhuma senha
          será enviada, armazenada ou alterada. Links reais de recuperação não são validados nesta
          demonstração.
        </Alert>
        {demo ? (
          <DemoPasswordReset />
        ) : (
          <Stack spacing={2}>
            <Alert severity="warning">
              Link ausente ou indisponível para esta demonstração. Inicie a recuperação simulada
              para abrir um link demonstrativo. A validade de links reais depende da API.
            </Alert>
            <Button component={RouterLink} to="/demonstracoes/recuperar-senha" variant="contained">
              Solicitar recuperação de senha
            </Button>
          </Stack>
        )}
        <Button component={RouterLink} to="/login" sx={{ mt: 3 }}>
          Voltar ao login
        </Button>
      </Container>
    </Box>
  );
}

function DemoPasswordReset() {
  const [visible, setVisible] = useState(false);
  const context = useQuery({
    queryKey: ['password-reset', 'demo-context'],
    queryFn: loadDemoResetContext,
    retry: false,
    staleTime: 0,
  });
  const resetPassword = useMutation({ mutationFn: simulatePasswordReset, retry: false });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });
  const busy = resetPassword.isPending;
  const submit = handleSubmit(() => {
    if (busy || context.isFetching || !context.data?.valid || context.isError) return;
    // Password is validated only in the form; the mock never receives it.
    resetPassword.mutate(undefined, {
      onSuccess: () => {
        reset();
        setVisible(false);
      },
    });
  });

  if (context.isPending)
    return (
      <Stack role="status" spacing={2} sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress />
        <Typography>Carregando link demonstrativo…</Typography>
      </Stack>
    );
  if (context.isError)
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => void context.refetch()}>
            Tentar novamente
          </Button>
        }
      >
        Não foi possível carregar o link demonstrativo.
      </Alert>
    );
  if (!context.data.valid)
    return (
      <Stack spacing={2}>
        <Alert severity="warning">Link demonstrativo inválido ou expirado.</Alert>
        <Button component={RouterLink} to="/demonstracoes/recuperar-senha">
          Solicitar novo link
        </Button>
      </Stack>
    );
  if (resetPassword.isSuccess)
    return (
      <Stack spacing={3}>
        <Alert severity="success" role="status">
          Simulação concluída. Sua senha real não foi alterada. Use suas credenciais existentes para
          entrar.
        </Alert>
        <Button component={RouterLink} to="/login" variant="contained">
          Ir para o login
        </Button>
      </Stack>
    );

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={3} aria-busy={busy}>
      {resetPassword.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" disabled={busy} onClick={() => void submit()}>
              Tentar novamente
            </Button>
          }
        >
          Não foi possível simular a alteração. Tente novamente.
        </Alert>
      )}
      <TextField
        label="Nova Senha"
        placeholder="Informe sua nova senha"
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        required
        fullWidth
        disabled={busy || context.isFetching}
        {...register('password')}
        error={!!errors.password}
        helperText={errors.password?.message ?? 'Use de 8 a 128 caracteres, conforme o cadastro.'}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  disabled={busy}
                  aria-pressed={visible}
                  onClick={() => setVisible((value) => !value)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {visible ? 'Ocultar senha' : 'Mostrar senha'}
                </Button>
              </InputAdornment>
            ),
          },
        }}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={busy || context.isFetching}
        sx={{ py: 1.8 }}
      >
        {busy ? (
          <>
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
            Simulando alteração…
          </>
        ) : (
          'Alterar'
        )}
      </Button>
    </Stack>
  );
}
