const orderService = require('../services/orderService');
const { DependencyError } = require('../clients/serviceClient');

async function list(req, res, next) {
  try {
    res.status(200).json(await orderService.listOrders(req.query));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const order = await orderService.getOrder(req.params.id);
    return order ? res.status(200).json(order) : res.status(404).json({ error: 'Order not found' });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await orderService.createOrder(req.body ?? {});
    return result.error ? res.status(400).json({ error: result.error }) : res.status(201).json(result.order);
  } catch (err) {
    if (err instanceof DependencyError) {
      return res.status(err.status).json({ error: err.message, dependency: err.dependency });
    }
    next(err);
  }
}

module.exports = { list, get, create };
