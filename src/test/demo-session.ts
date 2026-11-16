import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { authToken } from '@/shared/api/auth-token';
import { queryClient } from '@/app/providers/queryClient';

const server = setupServer(
  http.get(`${window.location.origin}/api/v1/auth/me`, () =>
    HttpResponse.json({
      id: 'demo-unit',
      name: 'Demo de interface',
      email: 'unit@example.test',
      sectorId: null,
      role: 'ADMIN',
    }),
  ),
);

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => authToken.set('demo-unit-token'));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());
