const mongoose = require('mongoose');
const productRepository = require('../repositories/productRepository');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validateProduct(productData) {
  if (!productData.name || !productData.category) {
    return 'name, category, price, and stock are required';
  }

  if (!isNonNegativeNumber(productData.price) || !isNonNegativeNumber(productData.stock)) {
    return 'price and stock must be non-negative numbers';
  }

  return null;
}

async function listProducts() {
  return productRepository.findAll();
}

async function getProduct(id) {
  if (!isValidId(id)) {
    return null;
  }

  return productRepository.findById(id);
}

async function createProduct(productData) {
  const error = validateProduct(productData);
  if (error) {
    return { error };
  }

  const product = await productRepository.create(productData);
  return { product };
}

async function updateProduct(id, productData) {
  if (!isValidId(id)) {
    return { notFound: true };
  }

  const currentProduct = await productRepository.findById(id);

  if (!currentProduct) {
    return { notFound: true };
  }

  const error = validateProduct(productData);
  if (error) {
    return { error };
  }

  const product = await productRepository.update(id, productData);
  return { product };
}

async function deleteProduct(id) {
  if (!isValidId(id)) {
    return false;
  }

  return productRepository.remove(id);
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
