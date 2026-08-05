import request from 'supertest';
import app from '../../src/app';
import { ADMIN_ROUTE_MANIFEST } from '../helpers/adminRouteManifest';
import { extractExpressRoutes } from '../helpers/extractExpressRoutes';

const PUBLIC_ADMIN_ROUTES = new Set([
  'POST /api/admin/auth/login',
]);

function routeKey(method: string, path: string): string {
  return `${method} ${path}`;
}

function samplePath(path: string): string {
  return path
    .replace(/:id/g, '000000000000000000000000')
    .replace(/:gameweekId/g, '000000000000000000000000')
    .replace(/:userId/g, '000000000000000000000000')
    .replace(/:type/g, 'all')
    .replace(/:entity/g, 'users');
}

describe('admin route guard meta-test', () => {
  it('rejects unauthenticated access on every guarded admin route', async () => {
    const extracted = extractExpressRoutes(app, ['/api/admin', '/admin/queues']);
    const routes = extracted.length > 0 ? extracted : ADMIN_ROUTE_MANIFEST;

    const guardedRoutes = routes.filter(
      (route) => !PUBLIC_ADMIN_ROUTES.has(routeKey(route.method, route.path)),
    );

    expect(guardedRoutes.length).toBeGreaterThan(0);

    for (const route of guardedRoutes) {
      const path = samplePath(route.path);
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      const response = await request(app)[method](path);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    }

    // eslint-disable-next-line no-console
    console.log(`Verified ${guardedRoutes.length} guarded admin routes`);
  });

  it('allows public admin auth routes without an admin token', async () => {
    const loginRes = await request(app).post('/api/admin/auth/login').send({});
    expect(loginRes.status).not.toBe(401);
  });
});
