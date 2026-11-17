import { expect, test } from '@playwright/test';
import { prepareDemoSession } from './demo-session';
test.beforeEach(async ({ page }) => prepareDemoSession(page));
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
for (const path of [
  '/cartoes-combustivel',
  '/demonstracoes/cartoes-combustivel',
  '/demonstracoes/cartoes-combustivel/novo',
  '/demonstracoes/cartoes-combustivel/demo-1',
  '/demonstracoes/cartoes-combustivel/demo-1/editar',
]) {
  test(`HU30 sem mocks em produção: ${path}`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api') && !request.url().endsWith('/auth/me'))
        requests.push(request.url());
    });
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByRole('article')).toHaveCount(0);
    await expect(page.getByText('•••• 1042', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(
      path.startsWith('/demonstracoes') ? 1 : 0,
    );
    await expect(page.getByRole('button', { name: /Salvar|Vincular|Confirmar/ })).toHaveCount(0);
    expect(requests).toEqual([]);
  });
}
