const User = require('../models/User');

function findAll() {
  return User.find();
}

function findById(id) {
  return User.findById(id);
}

function create(userData) {
  return User.create(userData);
}

async function update(id, userData) {
  return User.findByIdAndUpdate(
    id,
    { name: userData.name, email: userData.email, course: userData.course, semester: userData.semester },
    { new: true, overwrite: true, runValidators: true }
  );
}

async function remove(id) {
  const result = await User.findByIdAndDelete(id);
  return Boolean(result);
}

module.exports = { findAll, findById, create, update, remove };
