import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const api = process.env.FSPH_SVO_API ?? 'http://127.0.0.1:8081';
if (new URL(api).hostname !== '127.0.0.1') throw new Error('Somente API local isolada é permitida');
test.skip(process.env.FSPH_LOCAL_SVO !== '1', 'Execute com o runner local isolado');
const password = 'SvoLocal-2026!';
async function login(page: Page, email: string) {
  const logout = page.getByRole('button', { name: 'Sair', exact: true });
  if (await logout.isVisible()) await logout.click();
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/');
}
async function token(request: APIRequestContext, email: string) {
  const r = await request.post(`${api}/api/v1/auth/login`, { data: { email, password } });
  expect(r.status()).toBe(200);
  return (await r.json()).accessToken as string;
}
function inputTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
test('triagem, atribuição, coleta móvel, providência, entrega e indicadores persistidos', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const admin = await token(request, 'admin.svo@fsph.test');
  const post = async (path: string, data: object, auth = admin) => {
    const r = await request.post(`${api}/api/v1/${path}`, {
      headers: { Authorization: `Bearer ${auth}` },
      data,
    });
    expect(r.status(), await r.text()).toBe(201);
    return await r.json();
  };
  const suffix = Date.now();
  const sector = await post('sectors', { name: `SVO acompanhamento ${suffix}` });
  const accounts: Record<string, { id: string; email: string; token: string }> = {};
  for (const role of ['ATENDENTE_SVO', 'GESTOR_FROTA', 'MOTORISTA', 'EQUIPE_COLETA_SVO']) {
    const email = `${role.toLowerCase()}.${suffix}@fsph.test`;
    const user = await post('users', {
      name: `Teste ${role}`,
      email,
      password,
      role,
      sectorId: sector.id,
    });
    accounts[role] = { id: user.id, email, token: await token(request, email) };
  }
  const other = await post('users', {
    name: 'Operador sem vínculo',
    email: `other.${suffix}@fsph.test`,
    password,
    role: 'EQUIPE_COLETA_SVO',
    sectorId: sector.id,
  });
  const otherToken = await token(request, other.email);
  await post('drivers', { userId: accounts.MOTORISTA!.id });
  const vehicle = await post('vehicles', {
    sectorId: sector.id,
    plate: `T${String(suffix).slice(-6)}`,
    model: 'Coleta local SVO',
    capacity: 3,
    usageType: 'SVO',
    currentOdometerKm: 0,
  });
  const team = await post('svo/teams', {
    name: `Equipe local ${suffix}`,
    initialMembers: [{ userId: accounts.EQUIPE_COLETA_SVO!.id, roleInTeam: 'Coleta' }],
  });
  const source = await post(
    'svo/requests',
    {
      occurredAt: new Date().toISOString(),
      deathLocationType: 'DOMICILE',
      address: 'Rua de teste local, 10',
      neighborhood: 'Centro',
      city: 'Aracaju',
      contactName: 'Contato fictício',
      contactPhone: '79999990000',
    },
    accounts.ATENDENTE_SVO!.token,
  );
  await login(page, accounts.ATENDENTE_SVO!.email);
  await page.goto(`/atendimento-svo?requestId=${source.id}`);
  await page.getByRole('button', { name: 'Aprovar solicitação', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar aprovação', exact: true }).click();
  await page.getByRole('link', { name: 'Gerar ou abrir coleta' }).click();
  await page.getByRole('button', { name: 'Gerar ordem da triagem aprovada' }).click();
  await expect(page).toHaveURL(/\/coletas-svo\/[^/]+$/);
  const orderId = new URL(page.url()).pathname.split('/').at(-1)!;
  await login(page, accounts.GESTOR_FROTA!.email);
  await page.goto(`/coletas-svo/${orderId}`);
  for (const [label, name] of [
    ['Motorista', 'Teste MOTORISTA'],
    ['Veículo', `${vehicle.plate} — Coleta local SVO`],
    ['Equipe', team.name],
  ]) {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name, exact: true }).click();
  }
  const scheduled = new Date(Date.now() + 60000);
  scheduled.setSeconds(0, 0);
  const returnAt = new Date(scheduled.getTime() + 3600000);
  await page.getByRole('textbox', { name: 'Agendamento', exact: true }).fill(inputTime(scheduled));
  await page
    .getByRole('textbox', { name: 'Retorno previsto', exact: true })
    .fill(inputTime(returnAt));
  await page.getByRole('button', { name: 'Salvar atribuição', exact: true }).click();
  await expect(page.getByText('Atribuição salva.', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, accounts.EQUIPE_COLETA_SVO!.email);
  await page.goto('/coletas-svo');
  await page.getByRole('link', { name: `Abrir ordem ${source.protocolNumber}` }).click();
  await page.getByRole('button', { name: 'Iniciar deslocamento', exact: true }).click();
  await page.getByLabel('Observação em campo').fill('Coleta registrada em campo');
  await page.getByRole('button', { name: 'Registrar coleta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Concluir entrega' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.deploy-validation/svo-local/coleta-390.png', fullPage: true });
  const collectorHeaders = { Authorization: `Bearer ${accounts.EQUIPE_COLETA_SVO!.token}` };
  const collected = await (
    await request.get(`${api}/api/v1/svo/orders/${orderId}`, { headers: collectorHeaders })
  ).json();
  const reportHeaders = { Authorization: `Bearer ${accounts.GESTOR_FROTA!.token}` };
  const inProgressReport = await (
    await request.get(`${api}/api/v1/svo/orders/report?vehicleId=${vehicle.id}`, {
      headers: reportHeaders,
    })
  ).json();
  expect(inProgressReport.collectionCount).toBe(1);
  expect(inProgressReport.deliveryCount).toBe(0);
  expect(inProgressReport.averageCollectionToDeliveryMinutes).toBeNull();
  const forbidden = await request.patch(`${api}/api/v1/svo/orders/${orderId}/status`, {
    headers: { Authorization: `Bearer ${otherToken}` },
    data: { expectedVersion: collected.version, status: 'DELIVERED' },
  });
  expect(forbidden.status()).toBe(403);
  const invalid = await request.patch(`${api}/api/v1/svo/orders/${orderId}/status`, {
    headers: collectorHeaders,
    data: { expectedVersion: collected.version, status: 'ASSIGNED' },
  });
  expect(invalid.status()).toBe(409);
  await page.setViewportSize({ width: 1366, height: 900 });
  await login(page, accounts.ATENDENTE_SVO!.email);
  await page.goto(`/coletas-svo/${orderId}`);
  await page.getByLabel('Providência ou observação').fill('Família informada pelo atendimento');
  await page.getByRole('button', { name: 'Registrar providência' }).click();
  await expect(page.getByText('Providência registrada.', { exact: true })).toBeVisible();
  await login(page, accounts.EQUIPE_COLETA_SVO!.email);
  await page.goto(`/coletas-svo/${orderId}`);
  await page.getByRole('button', { name: 'Concluir entrega', exact: true }).click();
  await expect(page.getByText('Entregue', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Família informada pelo atendimento', { exact: true })).toBeVisible();
  await expect(page.getByText('Coleta registrada em campo', { exact: true })).toBeVisible();
  const completed = await (
    await request.get(`${api}/api/v1/svo/orders/${orderId}`, { headers: collectorHeaders })
  ).json();
  const repeat = await request.patch(`${api}/api/v1/svo/orders/${orderId}/status`, {
    headers: collectorHeaders,
    data: { expectedVersion: completed.version, status: 'DELIVERED' },
  });
  expect(repeat.status()).toBe(409);
  await login(page, accounts.GESTOR_FROTA!.email);
  await page.goto('/indicadores-svo');
  await page.getByRole('combobox', { name: 'Veículo', exact: true }).click();
  await page.getByRole('option', { name: vehicle.plate, exact: true }).click();
  await page.getByRole('button', { name: 'Filtrar indicadores' }).click();
  await expect(page.getByText('Solicitação até coleta · 1 ordem')).toBeVisible();
  await expect(page.getByText('Coleta até entrega · 1 ordem')).toBeVisible();
  await page.screenshot({
    path: '.deploy-validation/svo-local/indicadores-1366.png',
    fullPage: true,
  });
  const report = await (
    await request.get(`${api}/api/v1/svo/orders/report?vehicleId=${vehicle.id}`, {
      headers: reportHeaders,
    })
  ).json();
  expect(report.averageRequestToCollectionMinutes).toBe(completed.requestToCollectionMinutes);
  expect(report.averageCollectionToDeliveryMinutes).toBe(completed.collectionToDeliveryMinutes);
  expect(report.averageRequestToDeliveryMinutes).toBe(completed.requestToDeliveryMinutes);
  expect(completed.events).toHaveLength(6);
  expect(completed.events[4].authorId).toBe(accounts.ATENDENTE_SVO!.id);
  expect(errors).toEqual([]);
  mkdirSync('.deploy-validation/svo-local', { recursive: true });
  writeFileSync(
    '.deploy-validation/svo-local/scenario-evidence.json',
    JSON.stringify(
      {
        orderId,
        requestId: source.id,
        status: completed.status,
        events: completed.events.map(
          (e: { type: string; authorName: string; occurredAt: string }) => ({
            type: e.type,
            authorName: e.authorName,
            occurredAt: e.occurredAt,
          }),
        ),
        metrics: report,
        forbidden: forbidden.status(),
        invalid: invalid.status(),
        repeat: repeat.status(),
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
});
