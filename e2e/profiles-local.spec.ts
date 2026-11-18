import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { roles, roleLabels, type UserRole } from '../src/shared/api/types';
import { profileTasks } from '../src/features/home/profile-tasks';

// This suite writes only to the explicitly enabled, disposable local API.
test.skip(process.env.FSPH_LOCAL_PROFILES !== '1', 'Execute pelo runner local isolado.');
const api = process.env.FSPH_PROFILES_API ?? 'http://127.0.0.1:8081';
if (!['127.0.0.1', 'localhost'].includes(new URL(api).hostname))
  throw new Error('Somente API local permitida.');
const adminEmail = process.env.FSPH_PROFILES_ADMIN_EMAIL ?? 'admin.perfis@fsph.test';
const password = process.env.FSPH_PROFILES_PASSWORD ?? 'PerfisLocal-2026!';
const suffix = Date.now();
const output = '.deploy-validation/perfis-local';

type RecordId = { id: string };
async function signIn(page: Page, email: string) {
  // Keep the mounted app when switching accounts so logout/login must clear its cache.
  if (new URL(page.url()).pathname !== '/login') await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Gestão de Frotas', exact: true })).toBeVisible();
}
async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/login');
}
async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post(`${api}/api/v1/auth/login`, { data: { email, password } });
  expect(response.status()).toBe(200);
  return (await response.json()).accessToken as string;
}

test('cadastro dos sete perfis, troca de conta e escopos reais da API', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  mkdirSync(output, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const adminToken = await tokenFor(request, adminEmail);
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const call = async (path: string, data: object, token = adminToken) => {
    const response = await request.post(`${api}/api/v1/${path}`, {
      data,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status(), `${path}: ${await response.text()}`).toBe(201);
    return await response.json();
  };
  const sectorsResponse = await request.get(`${api}/api/v1/sectors`, { headers: adminHeaders });
  expect(sectorsResponse.status()).toBe(200);
  const sector = ((await sectorsResponse.json()) as { id: string; name: string }[])[0]!;
  const accounts = {} as Record<UserRole, { id: string; email: string; token: string }>;
  const evidence: object[] = [];
  await signIn(page, adminEmail);

  for (const role of roles) {
    await test.step(`Administrador → Novo usuário → ${role} → salvar → entrar`, async () => {
      await page
        .getByRole('navigation', { name: 'Navegação principal' })
        .getByRole('link', { name: 'Usuários', exact: true })
        .click();
      await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Novo usuário', exact: true }).click();
      await expect(page).toHaveURL(/\/usuarios\/novo$/);
      const dialog = page.getByRole('dialog', { name: 'Novo usuário' });
      const email = `${role.toLowerCase()}.${suffix}@fsph.test`;
      await dialog.getByLabel('Nome', { exact: true }).fill(`Validação ${role}`);
      await dialog.getByLabel('E-mail', { exact: true }).fill(email);
      await dialog.getByLabel('Senha', { exact: true }).fill(password);
      await dialog.getByRole('combobox', { name: 'Setor', exact: true }).click();
      await page.getByRole('option', { name: sector.name, exact: true }).click();
      await dialog.getByRole('combobox', { name: 'Perfil', exact: true }).click();
      expect(await page.getByRole('option').count()).toBe(7);
      await page.getByRole('option', { name: roleLabels[role], exact: true }).click();
      const saved = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/v1/users' && r.request().method() === 'POST',
      );
      await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
      const response = await saved;
      expect(response.status()).toBe(201);
      expect(response.request().postDataJSON()).toMatchObject({ role, sectorId: sector.id, email });
      const created = await response.json();
      expect(created.role).toBe(role);
      const persisted = await request.get(`${api}/api/v1/users/${created.id}`, {
        headers: adminHeaders,
      });
      expect(persisted.status()).toBe(200);
      expect(await persisted.json()).toMatchObject({ role, sectorId: sector.id, email });
      await expect(dialog).not.toBeVisible();
      await signOut(page);
      await signIn(page, email);
      await expect(
        page.getByRole('heading', { name: profileTasks[role].title, exact: true }),
      ).toBeVisible();
      const token = await page.evaluate(() =>
        sessionStorage.getItem('fsph-fleet-management.access-token'),
      );
      expect(token).toBeTruthy();
      accounts[role] = { id: created.id, email, token: token! };
      const headers = { Authorization: `Bearer ${token}` };
      const sessionResponse = await request.get(`${api}/api/v1/auth/me`, { headers });
      expect(sessionResponse.status()).toBe(200);
      const session = await sessionResponse.json();
      expect(session).toMatchObject({ id: created.id, role });
      const menu = page.getByRole('navigation', { name: 'Navegação principal' });
      const menuLabels = await menu.getByRole('link').allTextContents();
      if (role !== 'ADMIN')
        await expect(menu.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0);
      await page.screenshot({ path: `${output}/${role.toLowerCase()}-inicio.png`, fullPage: true });

      // A permitted page and a real GET for every profile.
      const permitted =
        role === 'ADMIN'
          ? '/usuarios'
          : role === 'EMPLOYEE'
            ? '/solicitacoes'
            : role === 'MOTORISTA'
              ? '/viagens'
              : role === 'GESTOR_FROTA'
                ? '/atendimento-svo'
                : '/setores';
      const endpoint =
        role === 'ADMIN'
          ? '/users'
          : role === 'EMPLOYEE'
            ? '/trip-requests/mine'
            : role === 'MOTORISTA'
              ? '/routes'
              : role === 'GESTOR_FROTA'
                ? '/trip-requests'
                : '/sectors';
      await page.goto(permitted);
      await expect(page.locator('main h1')).toBeVisible();
      expect((await request.get(`${api}/api/v1${endpoint}`, { headers })).status()).toBe(200);
      expect((await request.get(`${api}/api/v1/sectors/${sector.id}`, { headers })).status()).toBe(
        200,
      );
      expect((await request.get(`${api}/api/v1/users/${created.id}`, { headers })).status()).toBe(
        role === 'ADMIN' ? 200 : 403,
      );
      if (role === 'EMPLOYEE') {
        await expect(
          page.getByRole('link', { name: 'Nova solicitação', exact: true }),
        ).toBeVisible();
      }
      // ADMIN has no denied module: its fixed matrix still cannot cancel another author's request (tested below).
      if (role !== 'ADMIN') {
        const deniedRoute = role === 'GESTOR_FROTA' ? '/usuarios/novo' : '/atendimento-svo';
        const deniedApi = role === 'GESTOR_FROTA' ? '/users' : '/trip-requests';
        await page.goto(deniedRoute);
        await expect(page.getByRole('alert')).toContainText('Acesso restrito');
        expect((await request.get(`${api}/api/v1${deniedApi}`, { headers })).status()).toBe(403);
        expect(
          (
            await request.post(`${api}/api/v1/users`, {
              headers,
              data: {
                name: 'Tentativa restrita',
                email: `denied.${role}.${suffix}@fsph.test`,
                password,
                role: 'EMPLOYEE',
                sectorId: sector.id,
              },
            })
          ).status(),
        ).toBe(403);
      }
      evidence.push({
        role,
        permissions: session.permissions,
        menu: menuLabels,
        permitted,
        api: 200,
        restriction: role === 'ADMIN' ? 'ownership checked below' : 403,
      });
      await signOut(page);
      expect((await request.get(`${api}/api/v1/auth/me`, { headers })).status()).toBe(401);
      // Use a new token after logout revokes the token observed in the browser.
      accounts[role].token = await tokenFor(request, email);
      await signIn(page, adminEmail);
    });
  }

  await test.step('listas próprias, registros alheios por ID, frota e motorista atribuído', async () => {
    const employee = accounts.EMPLOYEE;
    const driver = accounts.MOTORISTA;
    const manager = accounts.GESTOR_FROTA;
    const requestBody = {
      origin: 'FSPH',
      destination: 'Hospital local',
      purpose: 'Validação de perfis',
      passengerCount: 1,
      departureAt: '2030-01-05T12:00:00Z',
      expectedReturnAt: '2030-01-05T14:00:00Z',
    };
    const ownRequest = await call('trip-requests', requestBody, employee.token);
    const otherSector = await call('sectors', { name: `Outro setor ${suffix}` });
    const foreignRequester = await call('users', {
      sectorId: otherSector.id,
      name: 'Solicitante de outro setor',
      email: `other.employee.${suffix}@fsph.test`,
      password,
      role: 'EMPLOYEE',
    });
    const foreignToken = await tokenFor(request, foreignRequester.email);
    const foreignRequest = await call(
      'trip-requests',
      {
        ...requestBody,
        destination: 'Destino de outra pessoa',
      },
      foreignToken,
    );
    const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
    const employeeMine = await request.get(`${api}/api/v1/trip-requests/mine`, {
      headers: headers(employee.token),
    });
    expect((await employeeMine.json()).map((r: RecordId) => r.id)).toEqual([ownRequest.id]);
    expect(
      (
        await request.get(`${api}/api/v1/trip-requests/${foreignRequest.id}`, {
          headers: headers(employee.token),
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.get(`${api}/api/v1/trip-requests/${ownRequest.id}`, {
          headers: headers(employee.token),
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.patch(`${api}/api/v1/trip-requests/${ownRequest.id}/cancel`, {
          headers: adminHeaders,
        })
      ).status(),
    ).toBe(403);

    const driverRecord = await call('drivers', { userId: driver.id });
    const otherUser = await call('users', {
      sectorId: sector.id,
      name: 'Outro condutor',
      email: `other.driver.${suffix}@fsph.test`,
      password,
      role: 'MOTORISTA',
    });
    const otherDriver = await call('drivers', { userId: otherUser.id });
    await call(`drivers/${driverRecord.id}/licenses`, {
      licenseNumber: '12345678901',
      category: 'D',
      issuedOn: '2025-01-01',
      expiresOn: '2035-01-01',
    });
    const vehicle = await call('vehicles', {
      sectorId: sector.id,
      plate: 'TST1A23',
      model: 'Veículo local',
      capacity: 8,
      usageType: 'INSTITUCIONAL',
      currentOdometerKm: 100,
    });
    const otherVehicle = await call('vehicles', {
      sectorId: sector.id,
      plate: 'TST2A34',
      model: 'Outro veículo local',
      capacity: 8,
      usageType: 'INSTITUCIONAL',
      currentOdometerKm: 100,
    });
    const ownRoute = await call(
      'routes',
      {
        vehicleId: vehicle.id,
        driverId: driverRecord.id,
        plannedStartAt: '2030-02-05T12:00:00Z',
        plannedDurationMinutes: 60,
      },
      manager.token,
    );
    const foreignRoute = await call(
      'routes',
      {
        vehicleId: otherVehicle.id,
        driverId: otherDriver.id,
        plannedStartAt: '2030-02-05T12:00:00Z',
        plannedDurationMinutes: 60,
      },
      manager.token,
    );
    expect(ownRoute.driverUserId).toBe(driver.id);
    const transport = await call(
      'transports',
      {
        occurredAt: '2026-11-18T12:00:00Z',
        serviceType: 'Validação local',
        pickupLocation: 'FSPH',
        destination: 'Hospital',
      },
      employee.token,
    );
    const foreignTransport = await call(
      'transports',
      {
        occurredAt: '2026-11-18T12:00:00Z',
        serviceType: 'Outra demanda',
        pickupLocation: 'FSPH',
        destination: 'Outro hospital',
      },
      foreignToken,
    );
    await call(
      `routes/${ownRoute.id}/stops`,
      { transportId: transport.id, stopSequence: 1 },
      manager.token,
    );
    expect(
      (
        await request.get(`${api}/api/v1/transports/${foreignTransport.id}`, {
          headers: headers(employee.token),
        })
      ).status(),
    ).toBe(403);
    const transportList = await request.get(`${api}/api/v1/transports`, {
      headers: headers(employee.token),
    });
    expect((await transportList.json()).content.map((r: RecordId) => r.id)).toEqual([transport.id]);
    const driverRoutes = await request.get(`${api}/api/v1/routes`, {
      headers: headers(driver.token),
    });
    expect((await driverRoutes.json()).content.map((r: RecordId) => r.id)).toEqual([ownRoute.id]);
    for (const path of [`routes/${foreignRoute.id}`, `routes/${foreignRoute.id}/stops`])
      expect(
        (await request.get(`${api}/api/v1/${path}`, { headers: headers(driver.token) })).status(),
      ).toBe(403);
    expect(
      (
        await request.post(`${api}/api/v1/routes/${foreignRoute.id}/start`, {
          headers: headers(driver.token),
          data: { startMileage: 100 },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(`${api}/api/v1/routes/${ownRoute.id}/start`, {
          headers: headers(manager.token),
          data: { startMileage: 100 },
        })
      ).status(),
    ).toBe(403);
    const all = await request.get(`${api}/api/v1/trip-requests`, {
      headers: headers(manager.token),
    });
    expect((await all.json()).map((r: RecordId) => r.id)).toEqual(
      expect.arrayContaining([ownRequest.id, foreignRequest.id]),
    );

    await signOut(page);
    await signIn(page, employee.email);
    await page.goto('/solicitacoes');
    await expect(page.getByRole('cell', { name: 'Hospital local', exact: true })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Destino de outra pessoa', exact: true }),
    ).toHaveCount(0);
    await page.goto(`/solicitacoes/${foreignRequest.id}`);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar solicitação', exact: true })).toHaveCount(
      0,
    );
    await signOut(page);
    await signIn(page, driver.email);
    await page.goto('/viagens');
    await expect(page.getByRole('heading', { name: 'Minhas viagens', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'TST1A23', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'TST2A34', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Ver viagem', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Iniciar viagem', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reagendar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Iniciar viagem', exact: true }).click();
    await page.getByLabel('Quilometragem inicial (km)', { exact: true }).fill('100');
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Concluir viagem', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Concluir', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Concluir viagem', exact: true }).click();
    await page.getByLabel('Quilometragem final (km)', { exact: true }).fill('110');
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Concluído', { exact: true }).first()).toBeVisible();
    await page.goto(`/viagens/${foreignRoute.id}`);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar viagem', exact: true })).toHaveCount(0);
    await signOut(page);
    await signIn(page, manager.email);
    await page.goto(`/solicitacoes/${ownRequest.id}`);
    await expect(
      page.getByRole('button', { name: 'Aprovar solicitação', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar solicitação', exact: true })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'Aprovar solicitação', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Agendar viagem', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Agendar viagem', exact: true }).click();
    await page.getByRole('combobox', { name: 'Veículo disponível', exact: true }).click();
    await page.getByRole('option', { name: /TST1A23/ }).click();
    await page.getByRole('combobox', { name: 'Motorista disponível', exact: true }).click();
    await page.getByRole('option', { name: 'Validação MOTORISTA', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText(/Agendamento confirmado/)).toBeVisible();
    await signOut(page);
    await signIn(page, accounts.ADMIN.email);
    await page.goto(`/solicitacoes/${foreignRequest.id}`);
    await expect(page.getByRole('button', { name: 'Editar solicitação', exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: 'Cancelar solicitação', exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await request.patch(`${api}/api/v1/trip-requests/${foreignRequest.id}/cancel`, {
          headers: headers(accounts.ADMIN.token),
        })
      ).status(),
    ).toBe(403);
    await signOut(page);
    const matrixResponse = await request.get(`${api}/api/v1/roles/permissions`, {
      headers: adminHeaders,
    });
    expect(matrixResponse.status()).toBe(200);
    const originalMatrix = await matrixResponse.json();
    const replace = async (role: UserRole, permissions: string[]) => {
      const response = await request.put(`${api}/api/v1/roles/${role}/permissions`, {
        headers: adminHeaders,
        data: { permissions },
      });
      expect(response.status()).toBe(200);
    };
    try {
      // A custom matrix must control UI capabilities independently of the role name.
      await replace('MOTORISTA', ['ROUTES_READ', 'ROUTES_MANAGE', 'ROUTES_EXECUTE']);
      const mixedRoute = await call('routes', {
        vehicleId: vehicle.id,
        driverId: driverRecord.id,
        plannedStartAt: '2031-02-05T12:00:00Z',
        plannedDurationMinutes: 60,
      });
      await signIn(page, driver.email);
      await page.goto(`/viagens/${mixedRoute.id}`);
      await expect(page.getByRole('button', { name: 'Iniciar viagem', exact: true })).toBeVisible();
      await page.goto(`/viagens/${foreignRoute.id}`);
      await expect(
        page.getByRole('heading', { name: 'Detalhes da viagem', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Iniciar viagem', exact: true })).toHaveCount(
        0,
      );
      await signOut(page);

      await replace('EQUIPE_COLETA_SVO', ['USERS_WRITE', 'SECTORS_READ']);
      const userListRequests: string[] = [];
      page.on('request', (req) => {
        if (new URL(req.url()).pathname === '/api/v1/users' && req.method() === 'GET')
          userListRequests.push(req.url());
      });
      await signIn(page, accounts.EQUIPE_COLETA_SVO.email);
      await page.goto('/usuarios/novo');
      await expect(page.getByRole('dialog', { name: 'Novo usuário' })).toBeVisible();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Nome', { exact: true }).fill('Cadastro sem leitura');
      await dialog.getByLabel('E-mail', { exact: true }).fill(`write.only.${suffix}@fsph.test`);
      await dialog.getByLabel('Senha', { exact: true }).fill(password);
      await dialog.getByRole('combobox', { name: 'Setor', exact: true }).click();
      await page.getByRole('option', { name: sector.name, exact: true }).click();
      await dialog.getByRole('combobox', { name: 'Perfil', exact: true }).click();
      await page.getByRole('option', { name: 'Colaborador', exact: true }).click();
      const creation = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/v1/users' && r.request().method() === 'POST',
      );
      await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
      expect((await creation).status()).toBe(201);
      await expect(dialog).toHaveCount(0);
      expect(userListRequests).toHaveLength(0);
      const writeToken = await page.evaluate(() =>
        sessionStorage.getItem('fsph-fleet-management.access-token'),
      );
      expect(
        (
          await request.get(`${api}/api/v1/users/${employee.id}`, { headers: headers(writeToken!) })
        ).status(),
      ).toBe(403);
      await signOut(page);
      await replace('EQUIPE_COLETA_SVO', ['USERS_WRITE']);
      await signIn(page, accounts.EQUIPE_COLETA_SVO.email);
      await page.goto('/usuarios/novo');
      await expect(page.getByRole('button', { name: 'Novo usuário', exact: true })).toBeDisabled();
      await expect(
        page.getByText(/sua conta também precisa de permissão para consultar/),
      ).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await signOut(page);
    } finally {
      await replace('MOTORISTA', originalMatrix.MOTORISTA);
      await replace('EQUIPE_COLETA_SVO', originalMatrix.EQUIPE_COLETA_SVO);
    }
  });
  expect(errors).toEqual([]);
  writeFileSync(
    `${output}/evidence.json`,
    JSON.stringify(
      {
        api: 'local Spring Boot + PostgreSQL isolado',
        profiles: evidence,
        scopes:
          'own requests/transports; assigned routes/stops; global manager; forbidden cross-ID; driver execution; manager approval/scheduling; ADMIN ownership restriction',
        errors,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    `${output}/accounts.json`,
    JSON.stringify(
      Object.entries(accounts).map(([role, account]) => ({ role, email: account.email })),
      null,
      2,
    ),
  );
});
