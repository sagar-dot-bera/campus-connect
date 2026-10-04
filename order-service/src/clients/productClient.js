const { productServiceUrl } = require('../config/services');
const { getResource } = require('./serviceClient');

function getProduct(productId) {
  return getResource('product-service', productServiceUrl, `/products/${encodeURIComponent(productId)}`, 'Product');
}

module.exports = { getProduct };
