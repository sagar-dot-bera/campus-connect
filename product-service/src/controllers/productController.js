const productService = require('../services/productService');

async function list(req, res, next) {
  try {
    res.status(200).json(await productService.listProducts());
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const product = await productService.getProduct(req.params.id);
    return product ? res.status(200).json(product) : res.status(404).json({ error: 'Product not found' });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await productService.createProduct(req.body);
    return result.error ? res.status(400).json({ error: result.error }) : res.status(201).json(result.product);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await productService.updateProduct(req.params.id, req.body);

    if (result.notFound) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return result.error ? res.status(400).json({ error: result.error }) : res.status(200).json(result.product);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await productService.deleteProduct(req.params.id);
    return deleted ? res.status(204).send() : res.status(404).json({ error: 'Product not found' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
