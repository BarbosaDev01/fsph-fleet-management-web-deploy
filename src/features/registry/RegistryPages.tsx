import { Alert, Button, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { roles, roleLabels, type Dto, type UserRole } from '@/shared/api/types';
import type { Field, FormValues } from '@/shared/components/FormDialog';
import { RegistryScreen, ActiveChip } from './RegistryScreen';
import { driversApi, sectorsApi, usersApi, vehiclesApi } from './api';
import { useAccess } from '@/features/auth/access';
import { ApiFeedback } from '@/shared/components/ApiFeedback';

const roleOptions = roles.map((value) => ({ value, label: roleLabels[value] }));
const sectorField = (sectors: Dto['SectorResponse'][] | undefined, required = true): Field => ({
  name: 'sectorId',
  label: 'Setor',
  required,
  options: [
    ...(!required ? [{ value: '', label: 'Sem setor' }] : []),
    ...(sectors ?? []).map((sector) => ({ value: sector.id, label: sector.name })),
  ],
});
const passwordField: Field = {
  name: 'password',
  label: 'Senha',
  type: 'password',
  required: true,
  minLength: 8,
  maxLength: 72,
};
const sectorFields: Field[] = [
  { name: 'name', label: 'Nome do setor', required: true, maxLength: 100 },
];
const activeOptions = [
  { value: 'true', label: 'Ativo' },
  { value: 'false', label: 'Inativo' },
];

export function SectorsPage() {
  const { can } = useAccess();
  return (
    <RegistryScreen
      name="sectors"
      title="Setores"
      createLabel="Novo setor"
      list={sectorsApi.list}
      columns={[{ label: 'Nome', render: (row) => row.name }]}
      filter={(row, text) => row.name.toLocaleLowerCase('pt-BR').includes(text)}
      create={{
        title: 'Novo setor',
        fields: sectorFields,
        submit: (values) => sectorsApi.create({ name: values.name! }),
      }}
      edit={(row) => ({
        title: 'Editar setor',
        fields: sectorFields,
        defaults: { name: row.name },
        submit: (values) => sectorsApi.update(row.id, { name: values.name! }),
      })}
      actions={(row, open) =>
        can('SECTORS_WRITE') && (
          <Button
            color="error"
            size="small"
            onClick={() =>
              open({
                title: `Excluir o setor ${row.name}?`,
                fields: [],
                submit: () => sectorsApi.remove(row.id),
              })
            }
          >
            Excluir
          </Button>
        )
      }
    />
  );
}

export function UsersPage() {
  const { can } = useAccess();
  const sectors = useQuery({
    queryKey: ['registry', 'sectors'],
    queryFn: ({ signal }) => sectorsApi.list(signal),
    enabled: can('SECTORS_READ') && can('USERS_WRITE'),
  });
  const fields: Field[] = [
    { name: 'name', label: 'Nome', required: true, maxLength: 150 },
    { name: 'email', label: 'E-mail', type: 'email', required: true, maxLength: 255 },
    {
      ...sectorField(sectors.data),
      label: 'Setor de lotação',
      helper:
        'Para os perfis de atendimento, gestão e coleta SVO, a Superintendência SVO é uma sugestão. Confirme a unidade de atuação da pessoa.',
    },
    {
      name: 'role',
      label: 'Perfil de acesso',
      required: true,
      options: roleOptions,
      helper:
        'O perfil define as permissões iniciais. As ações disponíveis seguem as permissões efetivas da conta.',
    },
  ];
  const userBody = (values: FormValues) => ({
    sectorId: values.sectorId!,
    name: values.name!.trim(),
    email: values.email!.trim(),
    role: values.role as UserRole,
  });
  return (
    <Stack spacing={2}>
      <ApiFeedback
        error={sectors.error}
        retry={() => {
          void sectors.refetch();
        }}
      />
      {can('USERS_WRITE') && !can('SECTORS_READ') && (
        <Alert severity="info">
          Para selecionar o setor do cadastro, sua conta também precisa de permissão para consultar
          setores.
        </Alert>
      )}
      {can('USERS_WRITE') && sectors.isLoading && (
        <Alert severity="info">Carregando os setores para o cadastro de usuários…</Alert>
      )}
      {can('USERS_WRITE') && sectors.isSuccess && sectors.data.length === 0 && (
        <Alert severity="info">
          Cadastre um setor antes de cadastrar usuários.
          {can('SECTORS_WRITE') && (
            <Button component={Link} to="/setores">
              Ir para setores
            </Button>
          )}
        </Alert>
      )}
      <RegistryScreen
        name="users"
        title="Usuários"
        createLabel="Novo usuário"
        createPath="/usuarios/novo"
        description="Gerencie o perfil de acesso e o setor de lotação de cada pessoa."
        list={usersApi.list}
        createDisabled={!sectors.isSuccess || !sectors.data.length}
        editDisabled={!sectors.isSuccess}
        columns={[
          { label: 'Nome', render: (row) => row.name },
          { label: 'E-mail', render: (row) => row.email },
          {
            label: 'Setor de lotação',
            render: (row) =>
              row.sectorId && row.sectorName ? (
                row.sectorName
              ) : (
                <Alert severity="warning">Lotação pendente</Alert>
              ),
          },
          { label: 'Perfil de acesso', render: (row) => roleLabels[row.role] },
          { label: 'Situação', render: (row) => <ActiveChip active={row.active} /> },
        ]}
        filter={(row, text) =>
          `${row.name} ${row.email} ${row.sectorName ?? 'Lotação pendente'} ${roleLabels[row.role]}`
            .toLocaleLowerCase('pt-BR')
            .includes(text)
        }
        create={{
          title: 'Novo usuário',
          fields: [...fields.slice(0, 2), passwordField, ...fields.slice(2)],
          submit: (values) => usersApi.create({ ...userBody(values), password: values.password! }),
        }}
        edit={(row) => ({
          title: 'Editar usuário',
          fields,
          defaults: {
            sectorId: row.sectorId ?? '',
            name: row.name,
            email: row.email,
            role: row.role,
          },
          submit: (values) => usersApi.update(row.id, { ...userBody(values), active: row.active }),
        })}
        actions={(row, open) =>
          can('USERS_WRITE') && (
            <>
              <Button
                size="small"
                onClick={() =>
                  open({
                    title: `Alterar senha de ${row.name}`,
                    fields: [passwordField],
                    submit: (values) => usersApi.password(row.id, { password: values.password! }),
                  })
                }
              >
                Senha
              </Button>
              <Button
                size="small"
                color={row.active ? 'error' : 'primary'}
                onClick={() =>
                  open({
                    title: `${row.active ? 'Desativar' : 'Reativar'} ${row.name}?`,
                    fields: [],
                    submit: () =>
                      row.active ? usersApi.deactivate(row.id) : usersApi.reactivate(row.id),
                  })
                }
              >
                {row.active ? 'Desativar' : 'Reativar'}
              </Button>
            </>
          )
        }
      />
    </Stack>
  );
}

export function VehiclesPage() {
  const { can } = useAccess();
  const sectors = useQuery({
    queryKey: ['registry', 'sectors'],
    queryFn: ({ signal }) => sectorsApi.list(signal),
    enabled: can('SECTORS_READ'),
  });
  const fields: Field[] = [
    sectorField(sectors.data, false),
    { name: 'plate', label: 'Placa', required: true, maxLength: 11 },
    { name: 'model', label: 'Modelo', required: true, maxLength: 150 },
    { name: 'capacity', label: 'Capacidade', type: 'number', required: true, min: 1 },
    { name: 'usageType', label: 'Tipo de uso', required: true, maxLength: 50 },
    {
      name: 'currentOdometerKm',
      label: 'Quilometragem atual (km)',
      type: 'number',
      required: true,
      min: 0,
    },
  ];
  const body = (values: FormValues): Dto['CreateVehicleRequest'] => ({
    sectorId: values.sectorId || null,
    plate: values.plate!,
    model: values.model!,
    capacity: Number(values.capacity),
    usageType: values.usageType!,
    currentOdometerKm: Number(values.currentOdometerKm),
  });
  return (
    <RegistryScreen
      name="vehicles"
      title="Veículos"
      createLabel="Novo veículo"
      list={vehiclesApi.list}
      filters={[
        {
          name: 'active',
          label: 'Situação',
          options: activeOptions,
          value: (row) => String(row.active),
        },
        ...(can('SECTORS_READ')
          ? [
              {
                name: 'sector',
                label: 'Setor',
                options: (sectors.data ?? []).map((sector) => ({
                  value: sector.id,
                  label: sector.name,
                })),
                value: (row: Dto['VehicleResponse']) => row.sectorId ?? 'none',
              },
            ]
          : []),
      ]}
      columns={[
        { label: 'Placa', render: (row) => row.plate },
        { label: 'Modelo', render: (row) => row.model },
        { label: 'Capacidade', render: (row) => row.capacity },
        { label: 'Uso', render: (row) => row.usageType },
        {
          label: 'Quilometragem',
          render: (row) => `${row.currentOdometerKm.toLocaleString('pt-BR')} km`,
        },
        { label: 'Situação', render: (row) => <ActiveChip active={row.active} /> },
      ]}
      filter={(row, text) =>
        `${row.plate} ${row.model} ${row.usageType}`.toLocaleLowerCase('pt-BR').includes(text)
      }
      create={{
        title: 'Novo veículo',
        fields,
        defaults: { currentOdometerKm: '0', sectorId: '' },
        submit: (values) => vehiclesApi.create(body(values)),
      }}
      edit={(row) => ({
        title: 'Editar veículo',
        fields: [
          sectorField(
            [
              ...(sectors.data ?? []),
              ...(row.sectorId && !sectors.data?.some((sector) => sector.id === row.sectorId)
                ? [{ id: row.sectorId, name: 'Setor atual' }]
                : []),
            ],
            false,
          ),
          ...fields.slice(1),
        ],
        defaults: {
          sectorId: row.sectorId ?? '',
          plate: row.plate,
          model: row.model,
          capacity: String(row.capacity),
          usageType: row.usageType,
          currentOdometerKm: String(row.currentOdometerKm),
        },
        submit: (values) => vehiclesApi.update(row.id, body(values)),
      })}
      actions={(row, open) => (
        <>
          <Button size="small" component={Link} to={`/veiculos/${row.id}`}>
            Detalhes
          </Button>
          <Button size="small" component={Link} to={`/veiculos/${row.id}/documentos`}>
            Documentos
          </Button>
          {row.active && can('VEHICLES_WRITE') && (
            <Button
              color="error"
              size="small"
              onClick={() =>
                open({
                  title: `Desativar o veículo ${row.plate}?`,
                  fields: [],
                  submit: () => vehiclesApi.deactivate(row.id),
                })
              }
            >
              Desativar
            </Button>
          )}
        </>
      )}
    />
  );
}

export function DriversPage() {
  const { can } = useAccess();
  const sectors = useQuery({
    queryKey: ['registry', 'sectors'],
    queryFn: ({ signal }) => sectorsApi.list(signal),
    enabled: can('SECTORS_READ'),
  });
  const users = useQuery({
    queryKey: ['registry', 'users'],
    queryFn: ({ signal }) => usersApi.list(signal),
    enabled: can('USERS_READ') && can('DRIVERS_WRITE'),
  });
  const userField: Field = {
    name: 'userId',
    label: 'Usuário motorista',
    required: true,
    options: (users.data ?? [])
      .filter((user) => user.active && user.role === 'MOTORISTA')
      .map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` })),
  };
  return (
    <Stack spacing={2}>
      <ApiFeedback
        error={users.error}
        retry={() => {
          void users.refetch();
        }}
      />
      {can('DRIVERS_WRITE') && !can('USERS_READ') && (
        <Alert severity="info">
          O cadastro vincula um usuário motorista existente. Sua conta precisa de permissão para
          consultar usuários.
        </Alert>
      )}
      {users.isSuccess && userField.options?.length === 0 && (
        <Alert severity="info">
          Nenhum usuário ativo com perfil Motorista disponível. Cadastre o usuário antes de
          vinculá-lo.
        </Alert>
      )}
      <RegistryScreen
        name="drivers"
        title="Motoristas"
        createLabel="Novo motorista"
        list={driversApi.list}
        filters={[
          {
            name: 'active',
            label: 'Situação',
            options: activeOptions,
            value: (row) => String(row.active && row.userActive),
          },
          ...(can('SECTORS_READ')
            ? [
                {
                  name: 'sector',
                  label: 'Setor',
                  options: (sectors.data ?? []).map((sector) => ({
                    value: sector.id,
                    label: sector.name,
                  })),
                  value: (row: Dto['DriverResponse']) => row.sectorId ?? 'none',
                },
              ]
            : []),
        ]}
        createDisabled={!users.isSuccess || !userField.options?.length}
        columns={[
          { label: 'Nome', render: (row) => row.name },
          { label: 'E-mail', render: (row) => row.email },
          { label: 'Motorista', render: (row) => <ActiveChip active={row.active} /> },
          { label: 'Usuário', render: (row) => <ActiveChip active={row.userActive} /> },
        ]}
        filter={(row, text) =>
          `${row.name} ${row.email} ${row.sectorId} ${row.active ? 'ativo' : 'inativo'}`
            .toLocaleLowerCase('pt-BR')
            .includes(text)
        }
        create={{
          title: 'Novo motorista',
          fields: [userField],
          submit: (values) => driversApi.create({ userId: values.userId! }),
        }}
        actions={(row, open) => (
          <>
            <Button component={Link} to={`/motoristas/${row.id}`} size="small">
              Detalhes
            </Button>
            <Button component={Link} to={`/motoristas/${row.id}/cnhs`} size="small">
              CNHs
            </Button>
            {row.active && can('DRIVERS_WRITE') && (
              <Button
                size="small"
                color="error"
                onClick={() =>
                  open({
                    title: `Desativar o motorista ${row.name}?`,
                    fields: [],
                    submit: () => driversApi.deactivate(row.id),
                  })
                }
              >
                Desativar
              </Button>
            )}
          </>
        )}
      />
    </Stack>
  );
}
