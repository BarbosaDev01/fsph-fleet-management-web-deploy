import { expect, test } from '@playwright/test';
import { openNavigation, prepareDemoSession } from './demo-session';
import { permissions } from '../src/shared/api/types';

for (const width of [390, 768, 1440]) {
  test(`padrão institucional: acesso e navegação em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Gestão de Frotas', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`login-${width}.png`), fullPage: true });

    await prepareDemoSession(page);
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        json: {
          id: 'institutional-admin',
          name: 'Administradora com nome institucional extenso para validar o cabeçalho responsivo',
          email: 'layout@example.test',
          role: 'ADMIN',
          sectorId: 's1',
          permissions,
        },
      }),
    );
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Gestão de Frotas', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Minha conta', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const menu = await openNavigation(page);
    await menu.getByRole('link', { name: 'Veículos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Veículos', exact: true })).toBeVisible();
    if (width < 900) await expect(menu).not.toBeVisible();
    const reopened = await openNavigation(page);
    await expect(reopened.getByRole('link', { name: 'Veículos', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    if (width < 900) {
      await page.keyboard.press('Escape');
      await expect(reopened).not.toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`veiculos-${width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Minha conta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();

    await page.goto('/pagina-inexistente');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`404-${width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Voltar ao início', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Gestão de Frotas', exact: true }),
    ).toBeVisible();
  });
}
