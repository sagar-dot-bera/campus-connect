// Downstream service locations come from the environment so the same image works
// inside Docker (http://user-service:3001) and on a laptop (http://localhost:3001).
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value.replace(/\/+$/, '');
}

module.exports = {
  userServiceUrl: required('USER_SERVICE_URL'),
  productServiceUrl: required('PRODUCT_SERVICE_URL'),
  timeoutMs: Number(process.env.DEPENDENCY_TIMEOUT_MS) || 3000
};
