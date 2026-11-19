import { useFuelCardsPath } from '@/features/fuel-cards/data/useFuelCardsPath';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';

import type { FuelCard } from '@/features/fuel-cards/fuel-card.types';
import type {
  FuelCardFormValues,
  FuelCardsRepository,
} from '@/features/fuel-cards/data/fuel-cards-repository';
import { useFuelCardsData } from '@/features/fuel-cards/data/FuelCardsProvider';

export function FuelCardForm({ card }: { card?: FuelCard }) {
  const data = useFuelCardsData();
  if (!data?.repository)
    return <Alert severity="info">Integração indisponível. Volte à listagem.</Alert>;
  return <FuelCardFields key={card?.id ?? 'new'} card={card} repository={data.repository} />;
}

function FuelCardFields({
  card,
  repository,
}: {
  card?: FuelCard;
  repository: FuelCardsRepository;
}) {
  const data = useFuelCardsData();
  const navigate = useNavigate();
  const basePath = useFuelCardsPath();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FuelCardFormValues>({
    resolver: zodResolver(card ? repository.editSchema : repository.formSchema),
    defaultValues: {
      number: '',
      limit: card?.totalLimit?.toFixed(2).replace('.', ',') ?? '',
      validity: card?.validity?.split('/').reverse().join('-') ?? '',
      cardholderName: card?.cardholderName ?? '',
      availableBalance: card?.availableBalance?.toFixed(2).replace('.', ',') ?? '',
      notes: card?.notes ?? '',
    },
  });
  const { ref: numberRef, ...numberField } = register('number');
  const { ref: holderRef, ...holderField } = register('cardholderName');
  const { ref: balanceRef, ...balanceField } = register('availableBalance');
  const { ref: notesRef, ...notesField } = register('notes');
  const { ref: limitRef, ...limitField } = register('limit');
  const { ref: validityRef, ...validityField } = register('validity');

  async function submit(values: FuelCardFormValues) {
    if (!data) return;
    const result = await (card ? data.editCard(card.id, values) : data.createCard(values));
    if ('error' in result) {
      setError(
        repository.mode === 'demo' ? 'number' : 'root',
        { message: result.error },
        { shouldFocus: repository.mode === 'demo' },
      );
      return;
    }
    navigate(card ? `${basePath}/${card.id}` : basePath);
  }

  return (
    <Stack component="form" noValidate onSubmit={handleSubmit(submit)} spacing={3}>
      {errors.root && <Alert severity="error">{errors.root.message}</Alert>}
      {repository.mode === 'demo' && (
        <Alert severity="info" role="note">
          Use apenas números fictícios. Validações provisórias: 8 a 19 dígitos, limite maior que
          zero e validade no mês atual ou futuro.{' '}
          {card
            ? 'Editar o limite não altera o saldo ou o status.'
            : 'O saldo e o status iniciais ficam como “Não informado”.'}
        </Alert>
      )}
      {repository.mode === 'api' && card ? (
        <TextField
          label="Número do cartão"
          value={card.card ?? ''}
          disabled
          helperText="O número não pode ser alterado pela API."
        />
      ) : (
        <TextField
          label={card ? 'Novo número do cartão' : 'Número do cartão'}
          type="password"
          required={!card}
          autoComplete="new-password"
          {...numberField}
          inputRef={numberRef}
          error={Boolean(errors.number)}
          helperText={
            errors.number?.message ??
            (card
              ? `Atual: ${card.card}. Deixe vazio para manter o número.`
              : 'Número oculto durante a digitação. Espaços e hífens são permitidos.')
          }
          slotProps={{ htmlInput: { maxLength: repository.mode === 'api' ? 50 : 40 } }}
        />
      )}
      {repository.mode === 'api' && (
        <TextField
          label="Titular ou identificador"
          required
          {...holderField}
          inputRef={holderRef}
          error={Boolean(errors.cardholderName)}
          helperText={errors.cardholderName?.message}
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
      )}
      <TextField
        label="Limite total (R$)"
        required
        {...limitField}
        inputRef={limitRef}
        error={Boolean(errors.limit)}
        helperText={errors.limit?.message ?? 'Exemplo: 1500,00. Não use separador de milhar.'}
        slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 20 } }}
      />
      <TextField
        label="Validade"
        type={repository.mode === 'api' ? 'date' : 'month'}
        required
        {...validityField}
        inputRef={validityRef}
        error={Boolean(errors.validity)}
        helperText={
          errors.validity?.message ??
          (repository.mode === 'api' ? 'Data completa de validade.' : 'Mês e ano de validade.')
        }
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {repository.mode === 'api' && (
        <>
          <TextField
            label="Saldo disponível (R$)"
            required={Boolean(card)}
            {...balanceField}
            inputRef={balanceRef}
            error={Boolean(errors.availableBalance)}
            helperText={
              errors.availableBalance?.message ??
              'No cadastro, deixe vazio para usar o limite total como saldo inicial.'
            }
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          />
          <TextField
            label="Observações"
            multiline
            minRows={2}
            {...notesField}
            inputRef={notesRef}
            error={Boolean(errors.notes)}
            helperText={errors.notes?.message}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || data?.busy}
          sx={{ minHeight: 44 }}
        >
          {card
            ? 'Salvar alterações'
            : repository.mode === 'demo'
              ? 'Salvar cartão demonstrativo'
              : 'Salvar cartão'}
        </Button>
        <Button component={Link} to={basePath} variant="outlined" sx={{ minHeight: 44 }}>
          {card ? 'Cancelar edição' : 'Cancelar cadastro'}
        </Button>
      </Stack>
    </Stack>
  );
}
