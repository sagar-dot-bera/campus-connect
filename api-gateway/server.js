require('dotenv').config({ quiet: true });

const express = require('express');
const { routes, findRoute } = require('./src/config/routes');
const { proxyTimeoutMs } = require('./src/config/gateway');
const requestLogger = require('./src/middleware/requestLogger');
const { createServiceProxy } = require('./src/proxy');

const app = express();
const port = process.env.PORT || 8080;

// No express.json() here: request bodies are streamed to the backend untouched.
app.use(requestLogger);

// The gateway's own health. Answers without contacting any backend.
app.get('/health', (req, res) => {
  res.json({ service: 'api-gateway', status: 'UP', uptimeSeconds: Math.round(process.uptime()) });
});

// Optional aggregate view: asks each registered service for its own /health.
app.get('/health/services', async (req, res) => {
  const results = await Promise.all(routes.map(async (route) => {
    try {
      const response = await fetch(`${route.target}/health`, { signal: AbortSignal.timeout(proxyTimeoutMs) });
      return { service: route.service, url: route.target, status: response.ok ? 'UP' : 'DEGRADED', httpStatus: response.status };
    } catch (err) {
      return { service: route.service, url: route.target, status: 'DOWN', reason: err.name === 'TimeoutError' ? 'timeout' : (err.cause?.code || err.message) };
    }
  }));
  const allUp = results.every((r) => r.status === 'UP');
  res.status(allUp ? 200 : 503).json({ gateway: 'UP', services: results });
});

const proxies = new Map(routes.map((route) => [route.prefix, createServiceProxy(route)]));

app.use((req, res, next) => {
  const route = findRoute(req.path);
  if (!route) {
    return next();
  }
  res.locals.route = route;
  return proxies.get(route.prefix)(req, res, next);
});

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API Gateway listening on port ${port}`);
    routes.forEach((route) => console.log(`[gateway] route ${route.prefix}/* -> ${route.service} (${route.target})`));
  });
}

module.exports = app;
