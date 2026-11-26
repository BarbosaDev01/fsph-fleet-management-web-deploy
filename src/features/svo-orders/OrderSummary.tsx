import { Box, Chip, Stack, Typography } from '@mui/material';
import { dateTime, orderStatuses, type SvoOrder } from './api';
export function OrderStatus({ order }: { order: SvoOrder }) {
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Chip
        size="small"
        variant="outlined"
        label={orderStatuses[order.status]}
        color={
          order.status === 'DELIVERED'
            ? 'success'
            : order.status === 'CANCELED'
              ? 'default'
              : 'info'
        }
      />
      <Chip
        size="small"
        variant="outlined"
        label={
          order.deadlineStatus === 'UNDEFINED'
            ? 'Sem prazo definido'
            : order.deadlineStatus === 'OVERDUE'
              ? 'Coleta em atraso'
              : order.deadlineStatus === 'CANCELED'
                ? 'Prazo encerrado'
                : 'Dentro do prazo de coleta'
        }
        color={order.deadlineStatus === 'OVERDUE' ? 'error' : 'default'}
      />
    </Stack>
  );
}
export function OrderSummary({ order }: { order: SvoOrder }) {
  const fields = [
    ['Endereço', `${order.address}, ${order.city}`],
    ['Agendamento', dateTime(order.scheduledAt)],
    ['Retorno previsto', dateTime(order.plannedReturnAt)],
    ['Prazo de coleta', dateTime(order.collectionDeadlineAt)],
    ['Motorista', order.driverName ?? 'A atribuir'],
    ['Equipe', order.teamName ?? 'Sem equipe'],
    ['Veículo', order.vehiclePlate ?? 'A atribuir'],
    ['Solicitada em', dateTime(order.requestedAt)],
    ['Coletada em', dateTime(order.collectedAt)],
    ['Entregue em', dateTime(order.deliveredAt)],
  ];
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' },
        gap: 2,
      }}
    >
      {fields.map(([label, value]) => (
        <Box key={label}>
          <Typography component="dt" variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
