import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { roleLabels, type UserRole } from '../src/shared/api/types';

test.skip(process.env.FSPH_LOCAL_PROFILES !== '1', 'Execute pelo runner local isolado.');
const api = process.env.FSPH_PROFILES_API ?? 'http://127.0.0.1:8081';
if (!['127.0.0.1', 'localhost'].includes(new URL(api).hostname))
  throw new Error('Somente API local permitida.');
const adminEmail = process.env.FSPH_PROFILES_ADMIN_EMAIL ?? 'admin.perfis@fsph.test';
const password = process.env.FSPH_PROFILES_PASSWORD ?? 'PerfisLocal-2026!';
const output = '.deploy-validation/perfis-local';
type Account = {
  id: string;
  name: string;
  email: string;
  sectorId: string;
  sectorName: string;
  role: UserRole;
  active: boolean;
};

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/');
}

test('lotação persiste, transferência mantém perfil e solicitantes do mesmo setor têm históricos individuais', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  mkdirSync(output, { recursive: true });
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  const auth = await request.post(`${api}/api/v1/auth/login`, {
    data: { email: adminEmail, password },
  });
  expect(auth.status()).toBe(200);
  const headers = { Authorization: `Bearer ${(await auth.json()).accessToken}` };
  const sectorsResponse = await request.get(`${api}/api/v1/sectors`, { headers });
  expect(sectorsResponse.status()).toBe(200);
  const sectors = (await sectorsResponse.json()) as { id: string; name: string }[];
  const unit = (name: string) => sectors.find((sector) => sector.name === name)!;
  for (const name of [
    'Administrativo',
    'Superintendência Lacen',
    'Superintendência Hemose',
    'Superintendência SVO',
    'Coordenação de Infraestrutura',
  ])
    expect(unit(name)).toBeTruthy();
  const initialAdmin = await (await request.get(`${api}/api/v1/auth/me`, { headers })).json();
  expect(initialAdmin.sectorId).toBe(unit('Administrativo').id);
  expect(initialAdmin.permissions).toEqual(expect.arrayContaining(['USERS_READ', 'USERS_WRITE']));
  const suffix = Date.now();
  await login(page, adminEmail);

  const create = async (name: string, sectorName: string, role: UserRole) => {
    await page.goto('/usuarios/novo');
    const dialog = page.getByRole('dialog', { name: 'Novo usuário' });
    const email = `${name.toLowerCase()}.${suffix}@fsph.test`;
    await dialog.getByLabel('Nome', { exact: true }).fill(`Lotação ${name}`);
    await dialog.getByLabel('E-mail', { exact: true }).fill(email);
    await dialog.getByLabel('Senha', { exact: true }).fill(password);
    await dialog.getByRole('combobox', { name: 'Perfil de acesso', exact: true }).click();
    await page.getByRole('option', { name: roleLabels[role], exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Setor de lotação', exact: true }).click();
    await page.getByRole('option', { name: sectorName, exact: true }).click();
    const saved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/users' &&
        response.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    const response = await saved;
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).toMatchObject({
      role,
      sectorId: unit(sectorName).id,
    });
    const account = (await response.json()) as Account;
    await expect(dialog).not.toBeVisible();
    await page.reload();
    const row = page.getByRole('row').filter({ hasText: email });
    await expect(row).toContainText(sectorName);
    await expect(row).toContainText(roleLabels[role]);
    const persisted = await request.get(`${api}/api/v1/users/${account.id}`, { headers });
    expect(persisted.status()).toBe(200);
    expect(await persisted.json()).toMatchObject({ role, sectorId: unit(sectorName).id });
    return account;
  };
  const lacen = await create('Lacen', 'Superintendência Lacen', 'EMPLOYEE');
  const hemose = await create('Hemose', 'Superintendência Hemose', 'EMPLOYEE');
  const peer = await create('LacenColega', 'Superintendência Lacen', 'EMPLOYEE');
  const driver = await create('Motorista', 'Superintendência Lacen', 'MOTORISTA');
  const evidence: object[] = [
    { scenario: 'create-reload', accounts: [lacen, hemose, peer, driver] },
  ];
  const get = async (path: string, authHeaders = headers) => {
    const response = await request.get(`${api}/api/v1/${path}`, { headers: authHeaders });
    expect(response.status(), path).toBe(200);
    return response.json();
  };
  const tokenFor = async (email: string) => {
    const response = await request.post(`${api}/api/v1/auth/login`, { data: { email, password } });
    expect(response.status()).toBe(200);
    return { Authorization: `Bearer ${(await response.json()).accessToken}` };
  };
  const driverHeaders = await tokenFor(driver.email);
  const beforeSession = await get('auth/me', driverHeaders);
  const driverRecord = await request.post(`${api}/api/v1/drivers`, {
    headers,
    data: { userId: driver.id },
  });
  expect(driverRecord.status()).toBe(201);
  const driverId = (await driverRecord.json()).id;
  const beforeVehicles = await get('vehicles');
  const beforeRoutes = await get('routes', driverHeaders);
  const beforeDriver = await get(`drivers/${driverId}`);
  const assignmentProvider = await request.get(`${api}/api/v1/vehicles/me`, {
    headers: driverHeaders,
  });
  expect(assignmentProvider.status()).toBe(503);

  const edit = async (account: Account, field: string, option: string) => {
    await page
      .getByRole('row')
      .filter({ hasText: account.email })
      .getByRole('button', { name: 'Editar', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Editar usuário' });
    await expect(
      dialog.getByRole('combobox', { name: 'Perfil de acesso', exact: true }),
    ).toContainText(roleLabels[account.role]);
    await expect(
      dialog.getByRole('combobox', { name: 'Setor de lotação', exact: true }),
    ).toContainText(account.sectorName);
    await dialog.getByRole('combobox', { name: field, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
    const saved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/v1/users/${account.id}` &&
        response.request().method() === 'PUT',
    );
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    expect((await saved).status()).toBe(200);
    await expect(dialog).not.toBeVisible();
    await page.reload();
    return (await get(`users/${account.id}`)) as Account;
  };
  const transferred = await edit(driver, 'Setor de lotação', 'Superintendência SVO');
  expect(transferred).toMatchObject({
    role: 'MOTORISTA',
    sectorId: unit('Superintendência SVO').id,
  });
  await expect(page.getByRole('row').filter({ hasText: driver.email })).toContainText(
    'Superintendência SVO',
  );
  const afterSession = await get('auth/me', driverHeaders);
  expect(afterSession.permissions).toEqual(beforeSession.permissions);
  expect(afterSession.permissions).not.toContain('TRIP_REQUESTS_READ');
  expect(await get('vehicles')).toEqual(beforeVehicles);
  expect(await get('routes', driverHeaders)).toEqual(beforeRoutes);
  expect(await get(`drivers/${driverId}`)).toEqual({
    ...beforeDriver,
    sectorId: transferred.sectorId,
  });
  expect(
    (await request.get(`${api}/api/v1/vehicles/me`, { headers: driverHeaders })).status(),
  ).toBe(503);
  expect(
    (await request.get(`${api}/api/v1/trip-requests`, { headers: driverHeaders })).status(),
  ).toBe(403);
  evidence.push({
    scenario: 'driver-transfer',
    before: driver,
    after: transferred,
    permissions: afterSession.permissions,
    fleetUnchanged: true,
    assignedRoutes: beforeRoutes.content,
    vehicleAssignmentProvider: 503,
    analysis: 403,
  });
  const changedRole = await edit(hemose, 'Perfil de acesso', roleLabels.GESTOR_FROTA);
  expect(changedRole).toMatchObject({ role: 'GESTOR_FROTA', sectorId: hemose.sectorId });
  await edit(changedRole, 'Perfil de acesso', roleLabels.EMPLOYEE);
  evidence.push({ scenario: 'role-only', before: hemose, after: changedRole });

  // Remove an unused unit after opening the form to exercise the real stale-link error.
  const temporaryResponse = await request.post(`${api}/api/v1/sectors`, {
    headers,
    data: { name: `Setor temporário ${suffix}` },
  });
  expect(temporaryResponse.status()).toBe(201);
  const temporarySector = await temporaryResponse.json();
  await page.reload();
  await page
    .getByRole('row')
    .filter({ hasText: lacen.email })
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  const invalidDialog = page.getByRole('dialog', { name: 'Editar usuário' });
  await invalidDialog.getByRole('combobox', { name: 'Setor de lotação', exact: true }).click();
  await page.getByRole('option', { name: temporarySector.name, exact: true }).click();
  expect(
    (await request.delete(`${api}/api/v1/sectors/${temporarySector.id}`, { headers })).status(),
  ).toBe(204);
  const rejectedSave = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/v1/users/${lacen.id}` &&
      response.request().method() === 'PUT',
  );
  await invalidDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  const rejectedResponse = await rejectedSave;
  expect(rejectedResponse.status()).toBe(404);
  const rejectedProblem = await rejectedResponse.json();
  await expect(invalidDialog.getByRole('alert')).toContainText(rejectedProblem.detail);
  await invalidDialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await get(`users/${lacen.id}`)).toEqual(lacen);
  evidence.push({
    scenario: 'api-error-in-form',
    status: 404,
    detail: rejectedProblem.detail,
    unchanged: true,
  });

  const beforeInvalid = await get(`users/${lacen.id}`);
  const invalid = await request.put(`${api}/api/v1/users/${lacen.id}`, {
    headers,
    data: { ...beforeInvalid, sectorId: randomUUID() },
  });
  expect(invalid.status()).toBe(404);
  expect((await invalid.json()).code).toBe('RESOURCE_NOT_FOUND');
  expect(await get(`users/${lacen.id}`)).toEqual(beforeInvalid);
  const lacenHeaders = await tokenFor(lacen.email);
  const peerHeaders = await tokenFor(peer.email);
  for (const target of [lacen, peer]) {
    const response = await request.put(`${api}/api/v1/users/${target.id}`, {
      headers: lacenHeaders,
      data: { ...target, role: 'ADMIN', sectorId: unit('Administrativo').id },
    });
    expect(response.status()).toBe(403);
    expect(await get(`users/${target.id}`)).toEqual(target);
  }
  // The account endpoint accepts only password fields; injected assignments must never persist.
  const passwordAttempt = await request.patch(`${api}/api/v1/users/me/password`, {
    headers: lacenHeaders,
    data: {
      currentPassword: password,
      newPassword: password,
      role: 'ADMIN',
      sectorId: unit('Administrativo').id,
    },
  });
  expect([204, 400]).toContain(passwordAttempt.status());
  expect(await get(`users/${lacen.id}`)).toEqual(lacen);
  evidence.push({
    scenario: 'unauthorized-and-invalid',
    ownAndOtherUpdate: 403,
    missingSector: 404,
    passwordEndpoint: passwordAttempt.status(),
    unchanged: true,
  });

  const requestBody = {
    origin: 'Lacen',
    destination: 'Destino individual',
    purpose: 'Verificação de lotação',
    passengerCount: 1,
    departureAt: '2032-01-05T12:00:00Z',
    expectedReturnAt: '2032-01-05T14:00:00Z',
  };
  const trips = [];
  for (const [index, authHeaders] of [lacenHeaders, peerHeaders].entries()) {
    const response = await request.post(`${api}/api/v1/trip-requests`, {
      headers: authHeaders,
      data: { ...requestBody, destination: `Destino individual ${index + 1}` },
    });
    expect(response.status()).toBe(201);
    trips.push(await response.json());
  }
  for (const [index, authHeaders] of [lacenHeaders, peerHeaders].entries()) {
    expect(
      (await get('trip-requests/mine', authHeaders)).map((trip: { id: string }) => trip.id),
    ).toEqual([trips[index].id]);
    expect(
      (
        await request.get(`${api}/api/v1/trip-requests/${trips[1 - index].id}`, {
          headers: authHeaders,
        })
      ).status(),
    ).toBe(403);
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await login(page, index === 0 ? lacen.email : peer.email);
    await page.goto('/solicitacoes');
    await expect(
      page.getByRole('cell', { name: `Destino individual ${index + 1}`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: `Destino individual ${2 - index}`, exact: true }),
    ).toHaveCount(0);
  }
  evidence.push({
    scenario: 'same-sector-individual-history',
    requesterIds: [lacen.id, peer.id],
    sectorId: lacen.sectorId,
    ownLists: 200,
    foreignId: 403,
  });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await login(page, adminEmail);
  await page.goto('/usuarios');
  await expect(page.getByRole('button', { name: 'Novo usuário', exact: true })).toBeEnabled();
  expect((await request.get(`${api}/api/v1/users`, { headers })).status()).toBe(200);
  await page.getByRole('textbox', { name: 'Buscar em usuários' }).fill('Lotação');
  await page.screenshot({ path: `${output}/lotacao-lista.png`, fullPage: true });
  evidence.push({
    scenario: 'initial-admin',
    sectorId: initialAdmin.sectorId,
    usersRead: 200,
    createEnabled: true,
  });
  expect(browserErrors).toEqual([]);
  writeFileSync(
    `${output}/lotacao-evidence.json`,
    JSON.stringify(
      { api: 'Spring Boot e PostgreSQL locais isolados', mocked: false, evidence, browserErrors },
      null,
      2,
    ),
  );
});
