import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const enabled = process.env.FSPH_LOCAL_SVO === '1' || process.env.REPORTS_REAL === '1';
const api = process.env.REPORTS_API_URL ?? process.env.FSPH_SVO_API;
const email = process.env.STAGING_ADMIN_EMAIL ?? process.env.FSPH_SVO_ADMIN_EMAIL;
const password = process.env.STAGING_ADMIN_PASSWORD ?? process.env.FSPH_SVO_PASSWORD;
test.skip(!enabled, 'Configure explicit real API test credentials.');

test('relatórios reais, exportações, impressão, sessão e layout responsivo', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  if (!api || !email || !password) throw new Error('Real API test configuration is incomplete.');
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/relatorios');
  await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
  const token = await page.evaluate(() =>
    sessionStorage.getItem('fsph-fleet-management.access-token'),
  );
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const checks: Record<string, number> = {};
  const indicators = [
    'availability',
    'fleet-status',
    'triage',
    'daily-requests',
    'ongoing-trips',
    'vehicle-consumption',
    'recent-fuelings',
    'maintenance-alerts',
    'general',
  ];
  for (const indicator of indicators) {
    const path = `/api/v1/reports/svo/${indicator}`;
    const response = await request.get(`${api}${path}`, { headers });
    expect(response.status(), `${path}: ${await response.text()}`).toBe(200);
    const snapshot = await response.json();
    checks[path] = response.status();
    for (const format of ['pdf', 'excel']) {
      const exported = await request.get(
        `${api}${path}/${format}?snapshotId=${snapshot.snapshotId}`,
        { headers },
      );
      expect(exported.status(), `${path}/${format}`).toBe(200);
      const body = await exported.body();
      expect(body.subarray(0, format === 'pdf' ? 4 : 2).toString()).toBe(
        format === 'pdf' ? '%PDF' : 'PK',
      );
      checks[`${path}/${format}`] = exported.status();
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const fuelingPath = `/api/v1/reports/fuelings?startDate=${today.slice(0, 8)}01&endDate=${today}`;
  const fuelings = await request.get(`${api}${fuelingPath}`, { headers });
  expect(fuelings.status()).toBe(200);
  checks['/api/v1/reports/fuelings'] = fuelings.status();
  const unauthenticated = await request.get(`${api}/api/v1/reports/svo/general`);
  expect(unauthenticated.status()).toBe(401);

  await page.getByLabel('Módulo', { exact: true }).selectOption('svo');
  await page.getByLabel('Tipo', { exact: true }).selectOption('general');
  await page.getByRole('button', { name: 'Consultar relatório', exact: true }).click();
  const preview = page.getByRole('region', { name: 'Relatório geral do SVO', exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole('heading', { level: 3 })).toHaveCount(8);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(preview).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `overflow at ${width}`,
    ).toBe(true);
  }
  for (const [label, signature] of [
    ['Gerar PDF', '%PDF'],
    ['Gerar Excel', 'PK'],
  ]) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: label!, exact: true }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    const file = await download.path();
    expect(file).toBeTruthy();
    expect(readFileSync(file!).subarray(0, signature!.length).toString()).toBe(signature);
  }
  await page.emulateMedia({ media: 'print' });
  await expect(preview).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal', includeHidden: true }),
  ).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Consultar relatório', exact: true, includeHidden: true }),
  ).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL('/login');
  const revoked = await request.get(`${api}/api/v1/auth/me`, { headers });
  expect(revoked.status()).toBe(401);
  expect(pageErrors).toEqual([]);
  mkdirSync('.deploy-validation/reports-real', { recursive: true });
  writeFileSync(
    '.deploy-validation/reports-real/evidence.json',
    JSON.stringify(
      {
        api,
        checks,
        unauthenticated: unauthenticated.status(),
        revoked: revoked.status(),
        widths: [390, 768, 1440],
        printChromeHidden: true,
        uiDownloads: ['pdf', 'excel'],
        pageErrors,
      },
      null,
      2,
    ),
  );
});
