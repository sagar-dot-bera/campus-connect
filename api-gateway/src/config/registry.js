// Service registry: the only place that knows where backend services live.
// Locations come from the environment, so moving a service (new host, new port,
// a cloud URL) is a configuration change, never a code change.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value.replace(/\/+$/, '');
}

module.exports = {
  'user-service': required('USER_SERVICE_URL'),
  'product-service': required('PRODUCT_SERVICE_URL'),
  'order-service': required('ORDER_SERVICE_URL')
};
