const mongoose = require('mongoose');
const orderRepository = require('../repositories/orderRepository');
const userClient = require('../clients/userClient');
const productClient = require('../clients/productClient');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function validateOrder(orderData) {
  if (!orderData.userId || !orderData.productId || orderData.quantity === undefined) {
    return 'userId, productId, and quantity are required';
  }

  if (!Number.isInteger(orderData.quantity) || orderData.quantity < 1) {
    return 'quantity must be a positive integer';
  }

  return null;
}

async function listOrders(query) {
  return orderRepository.findAll(query.userId ? { userId: String(query.userId) } : {});
}

async function getOrder(id) {
  if (!isValidId(id)) {
    return null;
  }

  return orderRepository.findById(id);
}

// Throws DependencyError (404/502/503) when the User or Product Service cannot confirm a reference.
async function createOrder(orderData) {
  const error = validateOrder(orderData);
  if (error) {
    return { error };
  }

  const { userId, productId, quantity } = orderData;

  // Order -> User Service, then Order -> Product Service (REST over the Docker network)
  const user = await userClient.getUser(userId);
  const product = await productClient.getProduct(productId);

  if (product.stock < quantity) {
    return { error: `Insufficient stock for ${product.name}: requested ${quantity}, available ${product.stock}` };
  }

  const order = await orderRepository.create({
    userId: user.id,
    productId: product.id,
    quantity,
    userName: user.name,
    productName: product.name,
    unitPrice: product.price,
    totalPrice: Math.round(product.price * quantity * 100) / 100
  });

  return { order };
}

module.exports = { listOrders, getOrder, createOrder };
