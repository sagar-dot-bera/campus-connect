// One line per request once the response is sent:
//   [gateway] GET /users/123 -> user-service (http://user-service:3001) 200 14ms
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const route = res.locals.route;
    const target = route ? `${route.service} (${route.target})` : 'gateway';
    console.log(`[gateway] ${req.method} ${req.originalUrl} -> ${target} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

module.exports = requestLogger;
