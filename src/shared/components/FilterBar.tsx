import { Button, MenuItem, Stack, TextField } from '@mui/material';

export type SelectFilter = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
};

export function FilterBar({
  search,
  searchLabel,
  onSearch,
  filters = [],
  values,
  onChange,
  onClear,
}: {
  search: string;
  searchLabel: string;
  onSearch: (value: string) => void;
  filters?: SelectFilter[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onClear: () => void;
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ flexWrap: 'wrap', gap: 2 }}>
      <TextField
        label={searchLabel}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        sx={{ flex: { xs: 'initial', sm: '1 1 220px' }, minWidth: 0 }}
      />
      {filters.map((filter) => (
        <TextField
          key={filter.name}
          label={filter.label}
          select
          value={values[filter.name] ?? ''}
          onChange={(event) => onChange(filter.name, event.target.value)}
          sx={{ minWidth: { sm: 180 } }}
        >
          <MenuItem value="">Todos</MenuItem>
          {filter.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
      <Button onClick={onClear} variant="outlined">
        Limpar filtros
      </Button>
    </Stack>
  );
}
