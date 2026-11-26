import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { PageHeading } from '@/shared/components/PageHeading';
import { ApiFeedback } from '@/shared/components/ApiFeedback';
import { ApiError, errorMessage } from '@/shared/api/result';
import { dateTimeInput } from '@/shared/format';
import {
  format,
  fuelingKeys,
  fuelingsApi,
  fuelTypes,
  type FuelingVehicle,
  type FuelType,
} from './fuelings.api';
import { useFuelingAccess } from './useFuelingAccess';

const today = () => dateTimeInput(new Date().toISOString()).slice(0, 10);
const toNumber = (value: string) => Number(value.replace(',', '.'));
const decimal = (places: number, message: string) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{1,7}([.,]\\d{1,${places}})?$`), message)
    .refine((value) => toNumber(value) > 0, 'Informe um valor maior que zero.');

function formSchema(vehicles: FuelingVehicle[]) {
  return z
    .object({
      vehicleId: z.string().min(1, 'Selecione o veículo.'),
      stationId: z.string().min(1, 'Selecione o posto credenciado.'),
      fuelType: z.string().min(1, 'Selecione o combustível.'),
      fueledOn: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data do abastecimento.')
        .refine((value) => value <= today(), 'A data não pode ser futura.'),
      odometerKm: z
        .string()
        .trim()
        .regex(/^\d{1,9}$/, 'Informe a quilometragem em km, apenas números.'),
      liters: decimal(3, 'Informe os litros com até três casas decimais. Exemplo: 42,350.'),
      totalValue: decimal(2, 'Informe o valor com até duas casas decimais. Exemplo: 250,90.'),
    })
    .superRefine((values, context) => {
      const current = vehicles.find(
        (vehicle) => vehicle.id === values.vehicleId,
      )?.currentOdometerKm;
      if (current != null && /^\d+$/.test(values.odometerKm) && Number(values.odometerKm) < current)
        context.addIssue({
          code: 'custom',
          path: ['odometerKm'],
          message: `A quilometragem não pode ser menor que a atual do veículo (${format.km(current)}).`,
        });
    });
}
type FormValues = z.infer<ReturnType<typeof formSchema>>;
const fields: (keyof FormValues)[] = [
  'vehicleId',
  'stationId',
  'fuelType',
  'fueledOn',
  'odometerKm',
  'liters',
  'totalValue',
];

export function FuelingCreatePage() {
  const { canRegister, vehicleScope } = useFuelingAccess();
  const vehicles = useQuery({
    queryKey: fuelingKeys.vehicles(vehicleScope ?? 'assigned'),
    queryFn: () => fuelingsApi.vehicles(vehicleScope!),
    enabled: canRegister,
    select: (list) =>
      list
        .filter((vehicle) => vehicle.active)
        .sort((a, b) => a.plate.localeCompare(b.plate, 'pt-BR')),
  });
  const stations = useQuery({
    queryKey: fuelingKeys.stations,
    queryFn: fuelingsApi.stations,
    enabled: canRegister,
  });

  if (!canRegister)
    return (
      <Alert severity="warning">
        Acesso restrito: seu perfil não permite registrar abastecimentos.
      </Alert>
    );

  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Stack spacing={3}>
        <Button component={Link} to="/abastecimentos" sx={{ alignSelf: 'flex-start' }}>
          Voltar ao histórico
        </Button>
        <PageHeading
          title="Registrar abastecimento"
          description="Informe os dados do cupom fiscal. O consumo e o preço por litro são calculados pelo sistema."
        />
        {vehicles.isPending || stations.isPending ? (
          <Stack role="status" spacing={2} sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress aria-label="Carregando veículos e postos" />
            <Typography>Carregando veículos e postos credenciados.</Typography>
          </Stack>
        ) : vehicles.isError || stations.isError ? (
          <ApiFeedback
            error={vehicles.error ?? stations.error}
            retry={() => {
              void vehicles.refetch();
              void stations.refetch();
            }}
          />
        ) : (
          <FuelingForm vehicles={vehicles.data} stations={stations.data} />
        )}
      </Stack>
    </Box>
  );
}

function FuelingForm({
  vehicles,
  stations,
}: {
  vehicles: FuelingVehicle[];
  stations: { id: string; name: string; city?: string | null; state?: string | null }[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schema = useMemo(() => formSchema(vehicles), [vehicles]);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: vehicles.length === 1 ? vehicles[0]!.id : '',
      stationId: '',
      fuelType: '',
      fueledOn: today(),
      odometerKm: '',
      liters: '',
      totalValue: '',
    },
  });
  const [vehicleId, liters, totalValue] = useWatch({
    control,
    name: ['vehicleId', 'liters', 'totalValue'],
  });
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  const pricePerLiter =
    toNumber(liters) > 0 && toNumber(totalValue) > 0
      ? toNumber(totalValue) / toNumber(liters)
      : undefined;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      fuelingsApi.create({
        vehicleId: values.vehicleId,
        stationId: values.stationId,
        fuelType: values.fuelType as FuelType,
        fueledOn: values.fueledOn,
        odometerKm: Number(values.odometerKm),
        liters: toNumber(values.liters),
        totalValue: toNumber(values.totalValue),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['fuelings'] });
      // O abastecimento atualiza o hodômetro do veículo no backend.
      await queryClient.invalidateQueries({ queryKey: ['registry'] });
      navigate('/abastecimentos', { state: { created } });
    },
    onError: (error) => {
      const violations = error instanceof ApiError ? (error.problem.violations ?? []) : [];
      for (const violation of violations)
        if (fields.includes(violation.field as keyof FormValues))
          setError(violation.field as keyof FormValues, { message: violation.message });
      setError('root', { message: errorMessage(error) });
    },
  });

  const select = (name: keyof FormValues) => {
    const { ref, ...field } = register(name);
    return { ...field, inputRef: ref, error: Boolean(errors[name]) };
  };

  if (vehicles.length === 0 || stations.length === 0)
    return (
      <Alert severity="info">
        {vehicles.length === 0
          ? 'Nenhum veículo ativo disponível para o seu perfil.'
          : 'Nenhum posto credenciado ativo. Cadastre um posto antes de registrar abastecimentos.'}
      </Alert>
    );

  return (
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
          Dados do abastecimento
        </Typography>
        <Stack
          component="form"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          spacing={3}
        >
          {errors.root && <Alert severity="error">{errors.root.message}</Alert>}
          <TextField
            select
            label="Veículo"
            required
            defaultValue={vehicles.length === 1 ? vehicles[0]!.id : ''}
            {...select('vehicleId')}
            helperText={
              errors.vehicleId?.message ??
              (vehicle?.currentOdometerKm != null
                ? `Hodômetro atual: ${format.km(vehicle.currentOdometerKm)}.`
                : undefined)
            }
          >
            {vehicles.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.plate} · {item.model}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Posto credenciado"
            required
            defaultValue=""
            {...select('stationId')}
            helperText={errors.stationId?.message}
          >
            {stations.map((station) => (
              <MenuItem key={station.id} value={station.id}>
                {station.name}
                {station.city
                  ? ` · ${station.city}${station.state ? `/${station.state}` : ''}`
                  : ''}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <TextField
              select
              label="Combustível"
              required
              defaultValue=""
              {...select('fuelType')}
              helperText={errors.fuelType?.message}
            >
              {Object.entries(fuelTypes).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Data do abastecimento"
              type="date"
              required
              {...select('fueledOn')}
              helperText={errors.fueledOn?.message}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            />
            <TextField
              label="Hodômetro (km)"
              required
              {...select('odometerKm')}
              helperText={
                errors.odometerKm?.message ?? 'Quilometragem no momento do abastecimento.'
              }
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 9 } }}
            />
            <TextField
              label="Litros"
              required
              {...select('liters')}
              helperText={errors.liters?.message ?? 'Exemplo: 42,350.'}
              slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 12 } }}
            />
            <TextField
              label="Valor total (R$)"
              required
              {...select('totalValue')}
              helperText={
                errors.totalValue?.message ?? 'Exemplo: 250,90. Não use separador de milhar.'
              }
              slotProps={{ htmlInput: { inputMode: 'decimal', maxLength: 12 } }}
            />
            <TextField
              label="Preço por litro"
              value={pricePerLiter ? format.money(pricePerLiter) : '—'}
              disabled
              helperText="Calculado a partir do valor e dos litros."
            />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={mutation.isPending}
              sx={{ minHeight: 44 }}
            >
              {mutation.isPending ? 'Salvando…' : 'Registrar abastecimento'}
            </Button>
            <Button component={Link} to="/abastecimentos" variant="outlined" sx={{ minHeight: 44 }}>
              Cancelar
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography component="h2" variant="h3" sx={{ fontWeight: 700 }}>
          Antes de salvar
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography color="text.secondary" variant="body2">
            Confira os valores no cupom fiscal. O registro não pode ser editado depois de salvo.
          </Typography>
          <Typography color="text.secondary" variant="body2">
            A quilometragem deve ser maior que a do último abastecimento do veículo e não pode ser
            menor que o hodômetro atual.
          </Typography>
          <Typography color="text.secondary" variant="body2">
            O sistema calcula o consumo (km/L) e sinaliza registros fora do padrão em relação à
            média do veículo.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
