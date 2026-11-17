import type { Page } from '@playwright/test';
import { permissions } from '../src/shared/api/types';

// Deterministic UI fixtures only. Real staging E2E uses staging-functional.spec.ts without routes.
export async function prepareDemoSession(page: Page) {
  const sectors = [
    { id: 's1', name: 'Administrativo' },
    { id: 's2', name: 'Operações' },
  ];
  const users = [
    {
      id: 'new-driver-user',
      sectorId: 's1',
      sectorName: 'Administrativo',
      name: 'Novo usuário motorista',
      email: 'novo@example.test',
      role: 'MOTORISTA',
      active: true,
    },
    {
      id: 'driver-user',
      sectorId: 's1',
      sectorName: 'Administrativo',
      name: 'Motorista de teste',
      email: 'motorista@example.test',
      role: 'MOTORISTA',
      active: true,
    },
  ];
  const vehicles = [
    {
      id: 'v1',
      sectorId: 's1',
      plate: 'ABC1D23',
      model: 'Van',
      capacity: 8,
      usageType: 'Coleta',
      currentOdometerKm: 1200,
      active: true,
    },
    {
      id: 'v2',
      sectorId: 's2',
      plate: 'DEF4G56',
      model: 'Carro',
      capacity: 5,
      usageType: 'Administrativo',
      currentOdometerKm: 900,
      active: false,
    },
  ];
  const drivers = [
    {
      id: 'd1',
      userId: 'driver-user',
      sectorId: 's1',
      name: 'Motorista de teste',
      email: 'motorista@example.test',
      active: true,
      userActive: true,
    },
  ];
  const requests = [
    {
      id: 'request-1',
      requesterId: 'ui-user',
      requesterName: 'Conta de teste de interface',
      requesterSectorName: 'Administrativo',
      origin: 'FSPH',
      destination: 'Hospital',
      purpose: 'Coleta',
      departureAt: '2030-01-05T12:00:00Z',
      expectedReturnAt: '2030-01-05T15:00:00Z',
      passengerCount: 2,
      status: 'PENDING',
    },
  ];
  await page.addInitScript(() =>
    sessionStorage.setItem('fsph-fleet-management.access-token', 'demo-e2e-token'),
  );
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1\//, '');
    const method = request.method();
    if (path === 'auth/me')
      return route.fulfill({
        json: {
          id: 'ui-user',
          name: 'Conta de teste de interface',
          email: 'ui@example.test',
          sectorId: 's1',
          role: 'ADMIN',
          permissions,
        },
      });
    if (path === 'auth/logout') return route.fulfill({ status: 204 });
    if (path === 'roles/permissions')
      return route.fulfill({ json: { ADMIN: permissions, MOTORISTA: ['VEHICLES_READ'] } });
    if (path === 'trip-requests' || path === 'trip-requests/mine') {
      if (method === 'POST') {
        const created = {
          ...request.postDataJSON(),
          id: `request-${requests.length + 1}`,
          requesterId: 'ui-user',
          requesterName: 'Conta de teste de interface',
          requesterSectorName: 'Administrativo',
          status: 'PENDING',
        };
        requests.push(created);
        return route.fulfill({ status: 201, json: created });
      }
      return route.fulfill({
        json: requests.filter(
          (row) => !url.searchParams.get('status') || row.status === url.searchParams.get('status'),
        ),
      });
    }
    const requestMatch = path.match(/^trip-requests\/([^/]+)(?:\/(.+))?$/);
    if (requestMatch) {
      const record = requests.find((row) => row.id === requestMatch[1]);
      if (!record)
        return route.fulfill({ status: 404, json: { detail: 'Solicitação não encontrada' } });
      if (requestMatch[2] === 'availability')
        return route.fulfill({
          json: {
            tripRequestId: record.id,
            availableVehicles: vehicles
              .filter((row) => row.active)
              .map((row) => ({ ...row, availablePassengerSeats: row.capacity - 1 })),
            availableDrivers: drivers.map((row) => ({ ...row, driverId: row.id })),
          },
        });
      if (method === 'PUT') Object.assign(record, request.postDataJSON());
      if (method === 'PATCH')
        Object.assign(
          record,
          requestMatch[2] === 'cancel'
            ? { status: 'CANCELED' }
            : requestMatch[2] === 'approve'
              ? { status: 'APPROVED' }
              : requestMatch[2] === 'reject'
                ? { status: 'REJECTED' }
                : { status: 'SCHEDULED' },
        );
      return route.fulfill({ json: record });
    }
    const collections: Record<string, object[]> = { sectors, users, vehicles, drivers };
    const [resource, id, child] = path.split('/');
    const list = collections[resource!];
    if (list) {
      if (child === 'documents' || child === 'licenses') return route.fulfill({ json: [] });
      if (!id && method === 'GET') return route.fulfill({ json: list });
      if (!id && method === 'POST') {
        const body = request.postDataJSON();
        const user = users.find((item) => item.id === body.userId);
        const created = {
          ...body,
          ...(resource === 'drivers' && user
            ? {
                name: user.name,
                email: user.email,
                sectorId: user.sectorId,
                userActive: user.active,
              }
            : {}),
          id: `${resource}-${list.length + 1}`,
          active: true,
        };
        list.push(created);
        return route.fulfill({ status: 201, json: created });
      }
      const record = list.find((row) => (row as { id: string }).id === id);
      if (!record)
        return route.fulfill({ status: 404, json: { detail: 'Registro não encontrado' } });
      if (method === 'PUT') Object.assign(record, request.postDataJSON());
      if (method === 'DELETE') {
        if (resource === 'sectors') list.splice(list.indexOf(record), 1);
        else Object.assign(record, { active: false });
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: record });
    }
    if (path === 'transports' || path === 'routes')
      return route.fulfill({
        json: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
      });
    return route.fallback();
  });
}

export async function openNavigation(page: Page) {
  const menu = page.getByRole('button', { name: 'Abrir menu de navegação' });
  if (await menu.isVisible()) await menu.click();
  return page.getByRole('navigation', { name: 'Navegação principal' });
}
