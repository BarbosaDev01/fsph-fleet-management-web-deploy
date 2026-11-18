import { useState, type ReactNode } from 'react';
import { Alert, Button, Chip, Stack } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiFeedback, Loading } from '@/shared/components/ApiFeedback';
import { DataTable, type Column } from '@/shared/components/DataTable';
import { FormDialog, type FormSpec } from '@/shared/components/FormDialog';
import { PageHeading } from '@/shared/components/PageHeading';
import { invalidateData } from '@/shared/api/invalidate';
import { useAccess } from '@/features/auth/access';
import type { Permission } from '@/shared/api/types';
import { FilterBar, type SelectFilter } from '@/shared/components/FilterBar';
import { useLocation, useNavigate } from 'react-router-dom';

export type { FormSpec } from '@/shared/components/FormDialog';
export function ActiveChip({ active }: { active: boolean }) {
  return (
    <Chip
      size="small"
      color={active ? 'success' : 'default'}
      label={active ? 'Ativo' : 'Inativo'}
    />
  );
}

export function RegistryScreen<T extends { id: string }>({
  name,
  title,
  createLabel,
  list,
  columns,
  create,
  edit,
  actions,
  filter,
  createDisabled = false,
  editDisabled = false,
  filters = [],
  createPath,
  description,
}: {
  name: string;
  title: string;
  createLabel: string;
  list: (signal?: AbortSignal) => Promise<T[]>;
  columns: Column<T>[];
  create: FormSpec;
  edit?: (row: T) => FormSpec;
  actions?: (row: T, open: (form: FormSpec) => void) => ReactNode;
  filter?: (row: T, search: string) => boolean;
  createDisabled?: boolean;
  editDisabled?: boolean;
  filters?: (SelectFilter & { value: (row: T) => string })[];
  createPath?: string;
  description?: string;
}) {
  const { can } = useAccess();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const writes: Record<string, Permission> = {
    sectors: 'SECTORS_WRITE',
    users: 'USERS_WRITE',
    vehicles: 'VEHICLES_WRITE',
    drivers: 'DRIVERS_WRITE',
  };
  const writePermission = name.startsWith('documents-')
    ? 'VEHICLES_WRITE'
    : name.startsWith('licenses-')
      ? 'DRIVERS_WRITE'
      : writes[name];
  const writable = Boolean(writePermission && can(writePermission));
  const [form, setForm] = useState<FormSpec | null>(null);
  const creatingByRoute = pathname.endsWith('/novo');
  const activeForm = writable
    ? (form ?? (creatingByRoute && !createDisabled ? create : null))
    : null;
  const closeForm = () => {
    setForm(null);
    if (creatingByRoute) void navigate(pathname.slice(0, -5), { replace: true });
  };
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const readable = name !== 'users' || can('USERS_READ');
  const query = useQuery({
    queryKey: ['registry', name],
    queryFn: ({ signal }) => list(signal),
    enabled: readable,
  });
  const rows = (query.data ?? []).filter(
    (row) =>
      (!filter || filter(row, search.toLocaleLowerCase('pt-BR'))) &&
      filters.every((entry) => !selected[entry.name] || entry.value(row) === selected[entry.name]),
  );
  return (
    <Stack spacing={2}>
      <PageHeading
        title={title}
        description={description}
        action={
          writable && (
            <Button
              variant="contained"
              disabled={createDisabled}
              onClick={() => {
                setSaved(false);
                if (createPath) void navigate(createPath);
                else setForm(create);
              }}
            >
              {createLabel}
            </Button>
          )
        }
      />
      {saved && (
        <Alert severity="success" onClose={() => setSaved(false)}>
          Operação concluída.
        </Alert>
      )}
      {!readable && (
        <Alert severity="info">
          Sua conta pode cadastrar usuários. A consulta da lista exige permissão para consultar
          usuários.
        </Alert>
      )}
      {readable && filter && (
        <FilterBar
          searchLabel={`Buscar em ${title.toLowerCase()}`}
          search={search}
          onSearch={setSearch}
          filters={filters}
          values={selected}
          onChange={(name, value) => setSelected((current) => ({ ...current, [name]: value }))}
          onClear={() => {
            setSearch('');
            setSelected({});
          }}
        />
      )}
      <ApiFeedback
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {readable &&
        (query.isPending ? (
          <Loading />
        ) : (
          !query.error && (
            <DataTable
              rows={rows}
              columns={columns}
              actions={(row) => (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}
                >
                  {writable && edit && (
                    <Button size="small" disabled={editDisabled} onClick={() => setForm(edit(row))}>
                      Editar
                    </Button>
                  )}
                  {actions?.(row, (spec) => {
                    if (writable) setForm(spec);
                  })}
                </Stack>
              )}
            />
          )
        ))}
      {activeForm && (
        <FormDialog
          title={activeForm.title}
          fields={activeForm.fields}
          defaults={activeForm.defaults}
          onClose={closeForm}
          onSubmit={async (values) => {
            await activeForm.submit(values);
            await invalidateData(client);
            setSaved(true);
          }}
        />
      )}
    </Stack>
  );
}
