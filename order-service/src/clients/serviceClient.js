const { timeoutMs } = require('../config/services');

class DependencyError extends Error {
  constructor(status, message, dependency) {
    super(message);
    this.status = status;
    this.dependency = dependency;
  }
}

// GET a resource from another service. Maps every outcome to something the caller
// can turn into a clear HTTP response instead of hanging or leaking a stack trace:
//   2xx                      -> parsed JSON body
//   404                      -> DependencyError(404) resource does not exist
//   any other status         -> DependencyError(502) dependency answered but misbehaved
//   network error / timeout  -> DependencyError(503) dependency unavailable
async function getResource(dependency, baseUrl, path, resourceName) {
  const url = `${baseUrl}${path}`;
  console.log(`[order-service] -> GET ${url}`);

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : (err.cause?.code || err.message);
    console.warn(`[order-service] x ${dependency} unavailable: ${reason}`);
    throw new DependencyError(503, `${dependency} is unavailable (${reason}). Please try again later.`, dependency);
  }

  console.log(`[order-service] <- ${response.status} from ${dependency}`);

  if (response.status === 404) {
    throw new DependencyError(404, `${resourceName} not found`, dependency);
  }

  if (!response.ok) {
    throw new DependencyError(502, `${dependency} returned an unexpected status ${response.status}`, dependency);
  }

  return response.json();
}

module.exports = { getResource, DependencyError };
