import { randomBytes, randomUUID } from 'node:crypto';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const api = 'https://fsph-fleet-api-staging.onrender.com';
const frontend = 'https://fsph-fleet-web-staging.vercel.app';

// CORS on staging allows the published frontend origin, not localhost. Route only the frontend
// artifact to our local build. The API domain is never intercepted, mocked, or fulfilled here.
async function localArtifact(context: BrowserContext) {
  await context.route(`${frontend}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) throw new Error('The backend must be called directly.');
    const response = await context.request.get(`http://127.0.0.1:4181${url.pathname}${url.search}`);
    await route.fulfill({ response });
  });
}
async function token(page: Page) {
  return page.evaluate(() => sessionStorage.getItem('fsph-fleet-management.access-token'));
}
function responseFor(page: Page, path: string, method: string) {
  return page.waitForResponse(
    (response) =>
      response.url().startsWith(api) &&
      new URL(response.url()).pathname === `/api/v1/${path}` &&
      response.request().method() === method,
  );
}
async function save(page: Page, path: string, method: string, expectedStatus = 200) {
  const response = responseFor(page, path, method);
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(expectedStatus);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  return result;
}

test('staging real: JWT, CRUD, persistência, autorização e ciclo de solicitação', async ({
  page,
  context,
  browser,
}, testInfo) => {
  test.skip(
    !process.env.STAGING_ADMIN_EMAIL || !process.env.STAGING_ADMIN_PASSWORD,
    'Requires real staging credentials; no backend mock fallback.',
  );
  test.setTimeout(300_000);
  await localArtifact(context);
  const tag = `E2E UI ${randomUUID().slice(0, 8)}`;
  const created: {
    sector?: string;
    user?: string;
    driver?: string;
    vehicle?: string;
    requests: string[];
  } = { requests: [] };
  let adminToken: string | null = null;
  let restrictedContext: BrowserContext | undefined;
  const evidence: { method: string; path: string; status: number }[] = [];
  page.on('response', (response) => {
    if (response.url().startsWith(api))
      evidence.push({
        method: response.request().method(),
        path: new URL(response.url()).pathname,
        status: response.status(),
      });
  });
  try {
    await page.goto('/veiculos');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('E-mail').fill(process.env.STAGING_ADMIN_EMAIL!);
    await page.getByLabel('Senha', { exact: true }).fill(process.env.STAGING_ADMIN_PASSWORD!);
    const login = responseFor(page, 'auth/login', 'POST');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    expect((await login).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Veículos', exact: true })).toBeVisible();
    adminToken = await token(page);
    const headers = { Authorization: `Bearer ${adminToken}` };
    const sectorsResponse = await page.request.get(`${api}/api/v1/sectors`, { headers });
    expect(sectorsResponse.status()).toBe(200);
    const sectors = (await sectorsResponse.json()) as { id: string; name: string }[];
    expect(sectors.length).toBeGreaterThan(0);

    await page.goto('/setores');
    await page.getByRole('button', { name: 'Novo setor', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Nome do setor').fill(tag);
    created.sector = (
      (await (await save(page, 'sectors', 'POST', 201)).json()) as { id: string }
    ).id;
    await page.reload();
    const sectorRow = page.getByRole('row').filter({ hasText: tag });
    await expect(sectorRow).toBeVisible();
    await sectorRow.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Nome do setor').fill(`${tag} editado`);
    await save(page, `sectors/${created.sector}`, 'PUT');
    await page.reload();
    await expect(sectorRow).toContainText('editado');
    await sectorRow.getByRole('button', { name: 'Excluir' }).click();
    await save(page, `sectors/${created.sector}`, 'DELETE', 204);
    created.sector = undefined;

    const driverName = `${tag} motorista`;
    const driverEmail = `e2e-${randomUUID()}@example.test`;
    const driverPassword = randomBytes(24).toString('base64url');
    await page.goto('/usuarios');
    await expect(page.getByRole('button', { name: 'Novo usuário' })).toBeEnabled();
    await page.getByRole('button', { name: 'Novo usuário' }).click();
    await page.getByRole('combobox', { name: 'Setor', exact: true }).click();
    await page.getByRole('option', { name: sectors[0]!.name, exact: true }).click();
    await page.getByRole('dialog').getByLabel('Nome', { exact: true }).fill(driverName);
    await page.getByRole('dialog').getByLabel('E-mail').fill(driverEmail);
    await page.getByRole('dialog').getByLabel('Senha', { exact: true }).fill(driverPassword);
    await page.getByRole('combobox', { name: 'Perfil', exact: true }).click();
    await page.getByRole('option', { name: 'Motorista', exact: true }).click();
    created.user = ((await (await save(page, 'users', 'POST', 201)).json()) as { id: string }).id;
    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: driverEmail })).toBeVisible();

    await page.goto('/motoristas');
    await expect(page.getByRole('button', { name: 'Novo motorista' })).toBeEnabled();
    await page.getByRole('button', { name: 'Novo motorista' }).click();
    await page.getByRole('combobox', { name: 'Usuário motorista' }).click();
    await page.getByRole('option', { name: `${driverName} · ${driverEmail}`, exact: true }).click();
    const driverResponse = await save(page, 'drivers', 'POST', 201);
    const driver = (await driverResponse.json()) as { id: string; userId: string };
    created.driver = driver.id;
    expect(driver.userId).toBe(created.user);
    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: driverName })).toBeVisible();
    await page.goto(`/motoristas/${driver.id}/cnhs`);
    await page.getByRole('button', { name: 'Registrar CNH' }).click();
    const licenseNumber = String(Date.now()).slice(-11);
    for (const [label, value] of Object.entries({
      'Número da CNH': licenseNumber,
      Categoria: 'D',
      'Data de emissão': '2020-01-01',
      Validade: '2035-01-01',
    }))
      await page.getByRole('dialog').getByLabel(label).fill(value);
    await save(page, `drivers/${driver.id}/licenses`, 'POST', 201);
    await page.reload();
    await expect(page.getByRole('cell', { name: licenseNumber, exact: true })).toBeVisible();

    const plate = `TST${randomBytes(2).toString('hex').toUpperCase()}`;
    await page.goto('/veiculos');
    await page.getByRole('button', { name: 'Novo veículo' }).click();
    for (const [label, value] of Object.entries({
      Placa: plate,
      Modelo: tag,
      Capacidade: '8',
      'Tipo de uso': 'Teste de homologação',
      'Quilometragem atual (km)': '100',
    }))
      await page.getByRole('dialog').getByLabel(label, { exact: true }).fill(value);
    created.vehicle = (
      (await (await save(page, 'vehicles', 'POST', 201)).json()) as { id: string }
    ).id;
    await page.reload();
    const vehicleRow = page.getByRole('row').filter({ hasText: plate });
    await expect(vehicleRow).toBeVisible();
    await vehicleRow.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Modelo', { exact: true }).fill(`${tag} revisado`);
    await save(page, `vehicles/${created.vehicle}`, 'PUT');
    await page.reload();
    await expect(vehicleRow).toContainText('revisado');
    await page.goto(`/veiculos/${created.vehicle}/documentos`);
    await page.getByRole('button', { name: 'Registrar documento' }).click();
    await page.getByRole('combobox', { name: 'Tipo', exact: true }).click();
    await page.getByRole('option', { name: 'Licenciamento', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Número do documento').fill(tag);
    await page.getByRole('dialog').getByLabel('Data de emissão').fill('2026-01-01');
    await page.getByRole('dialog').getByLabel('Validade').fill('2035-01-01');
    await save(page, `vehicles/${created.vehicle}/documents`, 'POST', 201);
    await page.reload();
    await expect(page.getByRole('cell', { name: tag, exact: true })).toBeVisible();

    // Past reservations for our disposable resources never reserve future operational capacity.
    const departure = Date.now() - 7 * 24 * 60 * 60_000;
    const localInput = (time: number) =>
      new Date(time - 3 * 60 * 60_000).toISOString().slice(0, 16);
    async function createRequest(label: string) {
      await page.goto('/solicitacoes/nova');
      await expect(page.getByRole('dialog')).toBeVisible();
      for (const [field, value] of Object.entries({
        Origem: tag,
        Destino: label,
        Finalidade: 'Teste automatizado de homologação, sem deslocamento',
        'Saída prevista': localInput(departure),
        'Retorno previsto': localInput(departure + 60 * 60_000),
        'Número de passageiros': '1',
      }))
        await page.getByRole('dialog').getByLabel(field).fill(value);
      const result = await save(page, 'trip-requests', 'POST', 201);
      const data = (await result.json()) as { id: string; status: string };
      created.requests.push(data.id);
      expect(data.status).toBe('PENDING');
      await page.goto(`/solicitacoes/${data.id}`);
      await expect(
        page.getByRole('heading', { name: `${tag} → ${label}`, exact: true }),
      ).toBeVisible();
      return data.id;
    }
    const canceledId = await createRequest(`${tag} cancelar`);
    await page.getByRole('button', { name: 'Editar solicitação' }).click();
    await page.getByRole('dialog').getByLabel('Destino').fill(`${tag} editada`);
    await save(page, `trip-requests/${canceledId}`, 'PUT');
    await page.reload();
    await expect(
      page.getByRole('heading', { name: `${tag} → ${tag} editada`, exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar solicitação', exact: true }).click();
    await save(page, `trip-requests/${canceledId}/cancel`, 'PATCH');
    await page.reload();
    await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();

    const rejectedId = await createRequest(`${tag} rejeitar`);
    await page.getByRole('button', { name: 'Rejeitar solicitação', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByLabel('Justificativa')
      .fill('Teste de rejeição em homologação.');
    await save(page, `trip-requests/${rejectedId}/reject`, 'PATCH');
    await page.reload();
    await expect(page.getByText('Rejeitada', { exact: true })).toBeVisible();

    const scheduledId = await createRequest(`${tag} agendar`);
    await page.getByRole('button', { name: 'Aprovar solicitação', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByLabel('Observações da decisão')
      .fill('Teste de agendamento histórico; sem operação de transporte.');
    await save(page, `trip-requests/${scheduledId}/approve`, 'PATCH');
    await expect(page.getByRole('button', { name: 'Agendar viagem' })).toBeEnabled();
    await page.getByRole('button', { name: 'Agendar viagem' }).click();
    await page.getByRole('combobox', { name: 'Veículo disponível' }).click();
    await page.getByRole('option', { name: new RegExp(plate) }).click();
    await page.getByRole('combobox', { name: 'Motorista disponível' }).click();
    await page.getByRole('option', { name: driverName, exact: true }).click();
    const scheduled = await save(page, `trip-requests/${scheduledId}/schedule`, 'PATCH');
    const schedule = (await scheduled.json()) as {
      status: string;
      assignedDriverId: string;
      assignedVehicleId: string;
    };
    expect(schedule).toMatchObject({
      status: 'SCHEDULED',
      assignedDriverId: created.driver,
      assignedVehicleId: created.vehicle,
    });
    await page.reload();
    await expect(page.getByText(/Agendamento confirmado pela API/)).toBeVisible();

    restrictedContext = await browser.newContext({ baseURL: frontend });
    await localArtifact(restrictedContext);
    const restricted = await restrictedContext.newPage();
    await restricted.goto('/usuarios');
    await restricted.getByLabel('E-mail').fill(driverEmail);
    await restricted.getByLabel('Senha', { exact: true }).fill(driverPassword);
    await restricted.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(
      restricted.getByText(/Sua conta não tem permissão para consultar este módulo/),
    ).toBeVisible();
    const driverToken = await token(restricted);
    const denied = await restricted.request.get(`${api}/api/v1/users`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    expect(denied.status()).toBe(403);
    await restricted.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(restricted).toHaveURL(/\/login$/);
  } finally {
    if (adminToken) {
      const headers = { Authorization: `Bearer ${adminToken}` };
      for (const id of created.requests) {
        const result = await page.request.get(`${api}/api/v1/trip-requests/${id}`, { headers });
        if (result.ok() && ((await result.json()) as { status: string }).status === 'PENDING')
          expect(
            (
              await page.request.patch(`${api}/api/v1/trip-requests/${id}/cancel`, { headers })
            ).status(),
          ).toBe(200);
      }
      for (const [resource, id] of [
        ['drivers', created.driver],
        ['vehicles', created.vehicle],
        ['users', created.user],
        ['sectors', created.sector],
      ]) {
        if (id)
          expect(
            (await page.request.delete(`${api}/api/v1/${resource}/${id}`, { headers })).status(),
          ).toBe(204);
      }
      const loggedOut = await page.request.post(`${api}/api/v1/auth/logout`, { headers });
      expect(loggedOut.status()).toBe(204);
      expect((await page.request.get(`${api}/api/v1/auth/me`, { headers })).status()).toBe(401);
    }
    await restrictedContext?.close();
    await testInfo.attach('http-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        requests: evidence,
        historicalTestRequestsRetained: created.requests.length,
        temporaryResourcesDeactivated: true,
      }),
    });
  }
});
