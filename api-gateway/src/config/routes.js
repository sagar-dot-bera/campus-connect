const registry = require('./registry');

// Routing table: public path prefix -> service name. URLs are looked up in the
// registry, so this file never contains a host or port.
const routeDefinitions = [
  { prefix: '/users', service: 'user-service' },
  { prefix: '/products', service: 'product-service' },
  { prefix: '/orders', service: 'order-service' }
];

const routes = routeDefinitions.map((route) => ({ ...route, target: registry[route.service] }));

function findRoute(path) {
  return routes.find((route) => path === route.prefix || path.startsWith(`${route.prefix}/`));
}

module.exports = { routes, findRoute };
