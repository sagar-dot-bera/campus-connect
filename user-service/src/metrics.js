'use strict';
const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'user_service_' });

const httpRequestsTotal = new client.Counter({
  name: 'user_service_http_requests_total',
  help: 'Total HTTP requests to User Service',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'user_service_http_request_duration_seconds',
  help: 'HTTP request duration for User Service',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const route = req.path || '/';
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route, status: res.statusCode }, duration);
  });
  next();
}

module.exports = { client, metricsMiddleware };
