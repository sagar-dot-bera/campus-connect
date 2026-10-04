const { createProxyMiddleware } = require('http-proxy-middleware');
const { proxyTimeoutMs } = require('./config/gateway');

// Connection-level failures: the service is down, not resolvable, or not answering.
const UNREACHABLE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNRESET', 'ETIMEDOUT']);

// Centralized error handling for every proxied route. A backend failure becomes a
// clear JSON 503 (unreachable / timed out) or 502 (other proxy failure) instead of
// a hung request or a crashed gateway.
function handleProxyError(route) {
  return (err, req, res) => {
    const timedOut = req.gatewayTimedOut === true;
    const status = timedOut || UNREACHABLE_CODES.has(err.code) ? 503 : 502;
    const reason = timedOut ? `timed out after ${proxyTimeoutMs}ms` : (err.code || err.message);
    console.warn(`[gateway] x ${route.service} failed: ${reason}`);

    if (res.headersSent) {
      res.destroy();
      return;
    }
    const error = status === 503
      ? `${route.service} is unavailable (${reason}). Please try again later.`
      : `Bad gateway: ${route.service} could not be proxied (${reason})`;
    res.status(status).json({ error, service: route.service });
  };
}

function createServiceProxy(route) {
  return createProxyMiddleware({
    target: route.target,
    // Rewrites Host to the target's host. Required for cloud targets such as
    // *.onrender.com, which route by Host header.
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: proxyTimeoutMs,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.on('timeout', () => { req.gatewayTimedOut = true; });
      },
      error: handleProxyError(route)
    }
  });
}

module.exports = { createServiceProxy };
