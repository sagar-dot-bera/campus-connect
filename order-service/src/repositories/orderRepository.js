const Order = require('../models/Order');

function findAll(filter = {}) {
  return Order.find(filter).sort({ createdAt: -1 });
}

function findById(id) {
  return Order.findById(id);
}

function create(orderData) {
  return Order.create(orderData);
}

module.exports = { findAll, findById, create };
