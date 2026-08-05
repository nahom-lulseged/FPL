import type { Express, Router } from 'express';

export interface ExtractedRoute {
  method: string;
  path: string;
}

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

function joinPaths(prefix: string, routePath: string): string {
  const normalizedPrefix = prefix.replace(/\/+$/, '') || '';
  const normalizedRoute = routePath.startsWith('/') ? routePath : `/${routePath}`;

  if (!normalizedPrefix) {
    return normalizedRoute.replace(/\/+/g, '/');
  }

  if (normalizedRoute === '/') {
    return normalizedPrefix;
  }

  return `${normalizedPrefix}${normalizedRoute}`.replace(/\/+/g, '/');
}

type RouteLayer = {
  route?: {
    path: string | RegExp | (string | RegExp)[];
    methods?: Record<string, boolean>;
  };
  name?: string;
  handle?: Router;
  regexp?: { source: string };
  path?: string;
};

function extractFromLayer(layer: RouteLayer, prefix: string, routes: ExtractedRoute[]): void {
  if (layer.route) {
    const pathValue = layer.route.path;
    const paths = Array.isArray(pathValue) ? pathValue : [pathValue];
    const methods = layer.route.methods ?? {};

    for (const routePath of paths) {
      if (typeof routePath !== 'string') {
        continue;
      }

      for (const [method, enabled] of Object.entries(methods)) {
        if (enabled && HTTP_METHODS.has(method)) {
          routes.push({
            method: method.toUpperCase(),
            path: joinPaths(prefix, routePath),
          });
        }
      }
    }
    return;
  }

  if (layer.name === 'router' && layer.handle?.stack) {
    const mountPath =
      typeof layer.path === 'string' && layer.path.length > 0
        ? layer.path
        : undefined;

    let nextPrefix = prefix;

    if (mountPath) {
      nextPrefix = joinPaths(prefix, mountPath);
    } else if (layer.regexp?.source) {
      const match = layer.regexp.source.match(/\\\/([^\\?]+)/g);
      if (match) {
        const segments = match
          .map((segment) => segment.replace('\\/', ''))
          .filter(Boolean);

        if (segments.length > 0) {
          nextPrefix = joinPaths(prefix, `/${segments.join('/')}`);
        }
      }
    }

    for (const nestedLayer of layer.handle.stack as unknown as RouteLayer[]) {
      extractFromLayer(nestedLayer, nextPrefix, routes);
    }
  }
}

export function extractExpressRoutes(app: Express, prefixes: string[]): ExtractedRoute[] {
  const routes: ExtractedRoute[] = [];
  const appWithRouter = app as Express & {
    _router?: { stack: RouteLayer[] };
    router?: { stack: RouteLayer[] };
  };
  const router = appWithRouter.router ?? appWithRouter._router;

  if (!router?.stack) {
    return routes;
  }

  for (const layer of router.stack) {
    extractFromLayer(layer, '', routes);
  }

  const normalizedPrefixes = prefixes.map((prefix) => prefix.replace(/\/+$/, ''));

  return routes.filter((route) =>
    normalizedPrefixes.some(
      (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`),
    ),
  );
}
