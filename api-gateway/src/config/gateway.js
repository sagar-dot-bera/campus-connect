module.exports = {
  // How long to wait for a backend before giving up with 503. Render free-tier
  // services sleep when idle and need ~50s to wake, so raise this there.
  proxyTimeoutMs: Number(process.env.GATEWAY_PROXY_TIMEOUT_MS) || 10000
};
