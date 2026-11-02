'use strict';
const client = require('prom-client');

// Collect default Node.js metrics (event loop, memory, CPU, GC, etc.)
client.collectDefaultMetrics({ prefix: 'gateway_' });

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total number of HTTP requests received by the API Gateway',
  labelNames: ['method', 'route', 'status'],
});

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Middleware: record metrics for every request
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
