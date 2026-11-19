import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const frontend = 'https://fsph-fleet-web-staging.vercel.app';
const api = 'https://fsph-fleet-api-staging.onrender.com';
const responseFor = (page: Page, path: string, method: string) =>
  page.waitForResponse(
    (response) =>
      response.url().startsWith(api) &&
      new URL(response.url()).pathname === `/api/v1/${path}` &&
      response.request().method() === method,
  );

test('cartões e triagem SVO persistem na API, inclusive consulta sem gerenciamento', async ({
  page,
  context,
}) => {
  test.skip(
    process.env.OPERATIONS_ALLOW_WRITES !== 'true' ||
      !process.env.STAGING_ADMIN_EMAIL ||
      !process.env.STAGING_ADMIN_PASSWORD,
    'Requires explicit staging write authorization and local credentials.',
  );
  test.setTimeout(300_000);
  // Local validation serves only frontend files under the allowed staging origin.
  // API requests are always real and are never intercepted or mocked.
  if (process.env.OPERATIONS_LOCAL_ARTIFACT)
    await context.route(`${frontend}/**`, async (route) => {
      const url = new URL(route.request().url());
      const response = await context.request.get(
        `${process.env.OPERATIONS_LOCAL_ARTIFACT}${url.pathname}${url.search}`,
      );
      await route.fulfill({ response });
    });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.name));
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(process.env.STAGING_ADMIN_EMAIL!);
  await page.getByLabel('Senha', { exact: true }).fill(process.env.STAGING_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
  const token = await page.evaluate(() =>
    sessionStorage.getItem('fsph-fleet-management.access-token'),
  );
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const stamp = Date.now().toString();
  const password = randomBytes(24).toString('base64url');
  let vehicleId: string | undefined;
  let userId: string | undefined;
  let cardId: string | undefined;
  let employeeToken: string | undefined;
  const call = async (path: string, method = 'GET', data?: unknown, auth = headers) => {
    const response = await context.request.fetch(`${api}/api/v1/${path}`, {
      method,
      headers: auth,
      data,
    });
    expect(response.ok(), `${method} ${path}: HTTP ${response.status()}`).toBeTruthy();
    return response.status() === 204 ? undefined : response.json();
  };
  try {
    const sectors = await call('sectors');
    const vehicle = await call('vehicles', 'POST', {
      sectorId: sectors[0].id,
      plate: `TST${stamp.slice(-7)}`,
      model: `TESTE integração ${stamp}`,
      capacity: 5,
      usageType: 'TESTE HOMOLOGACAO',
      currentOdometerKm: 0,
    });
    vehicleId = vehicle.id;
    const email = `qa.operations.${stamp}@example.invalid`;
    const employee = await call('users', 'POST', {
      sectorId: sectors[0].id,
      name: `TESTE consulta ${stamp}`,
      email,
      password,
      role: 'EMPLOYEE',
    });
    userId = employee.id;
    const login = await call('auth/login', 'POST', { email, password });
    employeeToken = login.accessToken;
    const employeeHeaders = { Authorization: `Bearer ${employeeToken}` };
    const createRequest = () =>
      call(
        'svo/requests',
        'POST',
        {
          deceasedName: `REGISTRO FICTÍCIO TESTE ${stamp}`,
          occurredAt: '2026-11-19T10:00:00Z',
          deathLocationType: 'DOMICILE',
          address: 'ENDEREÇO FICTÍCIO PARA TESTE',
          neighborhood: 'BAIRRO TESTE',
          city: 'CIDADE TESTE',
          contactName: 'CONTATO FICTÍCIO',
          contactPhone: '00000000000',
          hasSuspectedViolence: false,
          notes: 'Teste de integração autorizado. Sem ocorrência real.',
        },
        employeeHeaders,
      );
    const approve = await createRequest();
    const reject = await createRequest();
    console.log('PASS: fixtures identificadas como teste, sem alterar cadastros existentes');

    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Cartões de combustível', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Cartões de combustível', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Novo cartão', exact: true }).click();
    await page.getByLabel('Número do cartão', { exact: false }).fill(`TESTE-${stamp}`);
    await page.getByLabel('Titular ou identificador').fill(`TESTE cartão ${stamp}`);
    await page.getByLabel('Limite total (R$)').fill('1500,20');
    await page.getByLabel('Validade').fill('2027-12-17');
    await page.getByLabel('Saldo disponível (R$)').fill('500,10');
    const createResponse = responseFor(page, 'fuel-cards', 'POST');
    await page.getByRole('button', { name: 'Salvar cartão', exact: true }).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const card = await created.json();
    cardId = card.id;
    await page.goto(`/cartoes-combustivel/${cardId}`);
    await expect(page.getByText(`TESTE cartão ${stamp}`, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Editar cartão', exact: true }).click();
    await page.getByLabel('Titular ou identificador').fill(`TESTE editado ${stamp}`);
    await page.getByLabel('Limite total (R$)').fill('1750,35');
    await page.getByLabel('Saldo disponível (R$)').fill('400,25');
    const editResponse = responseFor(page, `fuel-cards/${cardId}`, 'PUT');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    const edited = await editResponse;
    expect(edited.status()).toBe(200);
    expect(edited.request().postDataJSON()).not.toHaveProperty('cardNumber');
    await expect(page.getByRole('combobox', { name: 'Veículo', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Veículo', exact: true }).click();
    await page
      .getByRole('option', { name: `${vehicle.plate} · ${vehicle.model}`, exact: true })
      .click();
    const bind = responseFor(page, `fuel-cards/${cardId}/bind-vehicle`, 'POST');
    await page.getByRole('button', { name: 'Vincular veículo', exact: true }).click();
    expect((await bind).status()).toBe(200);
    await page.reload();
    await expect(page.locator('dd').filter({ hasText: vehicle.plate })).toBeVisible();
    await page.getByRole('button', { name: 'Desvincular veículo', exact: true }).click();
    const unbind = responseFor(page, `fuel-cards/${cardId}/bind-vehicle`, 'DELETE');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar alteração', exact: true })
      .click();
    expect((await unbind).status()).toBe(200);
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Desvincular veículo', exact: true }),
    ).toBeDisabled();
    await page.getByRole('combobox', { name: 'Novo status', exact: true }).click();
    await page.getByRole('option', { name: 'Bloqueado', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar alteração de status', exact: true }).click();
    const status = responseFor(page, `fuel-cards/${cardId}/status`, 'PATCH');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar alteração', exact: true })
      .click();
    expect((await status).status()).toBe(200);
    await page.reload();
    await expect(page.locator('dd').filter({ hasText: 'Bloqueado' })).toBeVisible();
    expect(await call(`fuel-cards/${cardId}`)).toMatchObject({
      cardNumber: `TESTE-${stamp}`,
      cardholderName: `TESTE editado ${stamp}`,
      totalLimit: 1750.35,
      availableBalance: 400.25,
      expirationDate: '2027-12-17',
      vehicle: null,
      status: 'BLOCKED',
    });
    console.log(
      'PASS: cartão cadastrado, editado, vinculado, desvinculado e status persistidos após reload',
    );

    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Triagem SVO', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Atendimento SVO', exact: true })).toBeVisible();
    await page.getByRole('button', { name: approve.protocolNumber, exact: true }).click();
    await page.getByRole('button', { name: 'Aprovar solicitação', exact: true }).click();
    const approved = responseFor(page, `svo/requests/${approve.id}/triage`, 'PATCH');
    await page.getByRole('button', { name: 'Confirmar aprovação', exact: true }).click();
    expect((await approved).status()).toBe(200);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: reject.protocolNumber, exact: true }).click();
    await page.getByRole('button', { name: 'Rejeitar solicitação', exact: true }).click();
    await page
      .getByLabel('Justificativa', { exact: false })
      .fill('Rejeição fictícia para validar persistência.');
    const rejected = responseFor(page, `svo/requests/${reject.id}/triage`, 'PATCH');
    await page.getByRole('button', { name: 'Confirmar rejeição', exact: true }).click();
    expect((await rejected).status()).toBe(200);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    await page.getByRole('option', { name: 'Todos', exact: true }).click();
    await expect(
      page.getByRole('button', { name: approve.protocolNumber, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: reject.protocolNumber, exact: true }),
    ).toBeVisible();
    expect(await call(`svo/requests/${approve.id}`)).toMatchObject({ status: 'TRIAGED' });
    expect(await call(`svo/requests/${reject.id}`)).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Rejeição fictícia para validar persistência.',
    });
    const pending = await call('svo/requests?status=PENDING_TRIAGE&size=1');
    await expect(
      page
        .getByRole('region', { name: 'Resumo da operação' })
        .locator('.summary-item')
        .first()
        .locator('strong'),
    ).toHaveText(String(pending.totalElements));
    console.log('PASS: aprovação, rejeição, fila e contador persistidos após reload');

    const employeePage = await context.newPage();
    await employeePage.goto('/login');
    await employeePage.getByLabel('E-mail', { exact: true }).fill(email);
    await employeePage.getByLabel('Senha', { exact: true }).fill(password);
    await employeePage.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(employeePage.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
    await employeePage
      .getByRole('navigation')
      .getByRole('link', { name: 'Triagem SVO', exact: true })
      .click();
    await expect(
      employeePage.getByRole('button', { name: approve.protocolNumber, exact: true }),
    ).toBeVisible();
    await expect(
      employeePage.getByRole('button', { name: 'Aprovar solicitação', exact: true }),
    ).toHaveCount(0);
    await expect(
      employeePage.getByRole('button', { name: 'Rejeitar solicitação', exact: true }),
    ).toHaveCount(0);
    const denied = await context.request.patch(`${api}/api/v1/svo/requests/${approve.id}/triage`, {
      headers: employeeHeaders,
      data: { approved: false, rejectionReason: 'Teste de acesso negado' },
    });
    expect(denied.status()).toBe(403);
    await employeePage.goto('/cartoes-combustivel');
    await expect(employeePage.getByText(/Acesso restrito\. Sua conta/)).toBeVisible();
    await employeePage.close();
    console.log(
      'PASS: perfil EMPLOYEE consulta os próprios registros, não gerencia SVO (403) e não acessa cartões',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/atendimento-svo');
    await expect(page.getByRole('heading', { name: 'Atendimento SVO', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    expect(errors).toEqual([]);
  } finally {
    // Preserve card/SVO decisions as labeled test evidence; deactivate only the
    // test vehicle/user, and cancel the test card after removing any test link.
    if (cardId) {
      await call(`fuel-cards/${cardId}/bind-vehicle`, 'DELETE');
      await call(`fuel-cards/${cardId}/status`, 'PATCH', { status: 'CANCELED' });
    }
    if (vehicleId) await call(`vehicles/${vehicleId}`, 'DELETE');
    if (employeeToken)
      await call('auth/logout', 'POST', undefined, { Authorization: `Bearer ${employeeToken}` });
    if (userId) await call(`users/${userId}`, 'DELETE');
    await call('auth/logout', 'POST');
  }
});
