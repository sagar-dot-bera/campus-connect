const Product = require('../models/Product');

function findAll() {
  return Product.find();
}

function findById(id) {
  return Product.findById(id);
}

function create(productData) {
  return Product.create(productData);
}

async function update(id, productData) {
  return Product.findByIdAndUpdate(
    id,
    {
      name: productData.name,
      description: productData.description ?? '',
      category: productData.category,
      price: productData.price,
      stock: productData.stock
    },
    { new: true, overwrite: true, runValidators: true }
  );
}

async function remove(id) {
  const result = await Product.findByIdAndDelete(id);
  return Boolean(result);
}

module.exports = { findAll, findById, create, update, remove };
