import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type { Driver, Vehicle } from './types';

type Fields = {
  plate: string;
  model: string;
  category: string;
  name: string;
  license: string;
  sector: string;
};
type Props = {
  tab: 'vehicles' | 'drivers';
  vehicles: Vehicle[];
  drivers: Driver[];
  onClose: () => void;
  onVehicle: (value: Vehicle) => void;
  onDriver: (value: Driver) => void;
};

export function RegistrationDialog({
  tab,
  vehicles,
  drivers,
  onClose,
  onVehicle,
  onDriver,
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    defaultValues: { plate: '', model: '', category: 'Passeio', name: '', license: '', sector: '' },
  });
  const nonBlank = (value: string) => value.trim().length > 0 || 'Preencha este campo.';
  const fields: { key: keyof Fields; label: string }[] =
    tab === 'vehicles'
      ? [
          { key: 'plate', label: 'Placa' },
          { key: 'model', label: 'Modelo' },
        ]
      : [
          { key: 'name', label: 'Nome completo' },
          { key: 'license', label: 'Número da habilitação' },
          { key: 'sector', label: 'Setor' },
        ];
  function save(values: Fields) {
    if (tab === 'vehicles') {
      onVehicle({
        id: Math.max(0, ...vehicles.map((vehicle) => vehicle.id)) + 1,
        plate: values.plate.trim().toUpperCase(),
        model: values.model.trim(),
        category: values.category,
        driver: 'Não atribuído',
        status: 'Ativo',
      });
    } else {
      onDriver({
        id: Math.max(0, ...drivers.map((driver) => driver.id)) + 1,
        name: values.name.trim(),
        license: values.license.trim(),
        sector: values.sector.trim(),
        status: 'Disponível',
      });
    }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="registration-title">
      <Box component="form" noValidate onSubmit={handleSubmit(save)}>
        <DialogTitle id="registration-title">
          Cadastrar {tab === 'vehicles' ? 'veículo' : 'motorista'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Cadastro demonstrativo, mantido somente nesta sessão da tela.
            </Alert>
            {fields.map(({ key, label }, index) => {
              const { ref, ...registration } = register(key, {
                validate: {
                  nonBlank,
                  unique: (value) =>
                    key === 'plate'
                      ? !vehicles.some(
                          (vehicle) =>
                            vehicle.plate.trim().toUpperCase() === value.trim().toUpperCase(),
                        ) || 'Já existe um veículo com essa placa.'
                      : key === 'license'
                        ? !drivers.some((driver) => driver.license.trim() === value.trim()) ||
                          'Já existe um motorista com essa habilitação.'
                        : true,
                },
              });
              return (
                <TextField
                  key={key}
                  label={label}
                  required
                  autoFocus={index === 0}
                  error={Boolean(errors[key])}
                  helperText={errors[key]?.message}
                  inputRef={ref}
                  {...registration}
                />
              );
            })}
            {tab === 'vehicles' && (
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Categoria">
                    {['Passeio', 'Utilitário', 'Van', 'Caminhão', 'Motocicleta'].map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="inherit" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
