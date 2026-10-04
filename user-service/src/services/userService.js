const mongoose = require('mongoose');
const userRepository = require('../repositories/userRepository');

const requiredFields = ['name', 'email', 'course', 'semester'];

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function validateUser(userData) {
  const missingFields = requiredFields.filter((field) => !userData[field]);

  if (missingFields.length > 0) {
    return 'name, email, course, and semester are required';
  }

  return null;
}

function isDuplicateEmailError(err) {
  return err?.code === 11000 && Object.prototype.hasOwnProperty.call(err.keyPattern || {}, 'email');
}

async function listUsers() {
  return userRepository.findAll();
}

async function getUser(id) {
  if (!isValidId(id)) {
    return null;
  }

  return userRepository.findById(id);
}

async function createUser(userData) {
  const error = validateUser(userData);
  if (error) {
    return { error };
  }

  try {
    const user = await userRepository.create(userData);
    return { user };
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      return { error: 'A user with this email already exists' };
    }
    throw err;
  }
}

async function updateUser(id, userData, partial = false) {
  if (!isValidId(id)) {
    return { notFound: true };
  }

  const currentUser = await userRepository.findById(id);

  if (!currentUser) {
    return { notFound: true };
  }

  const data = partial ? { ...currentUser.toJSON(), ...userData } : userData;
  const error = validateUser(data);
  if (error) {
    return { error };
  }

  try {
    const user = await userRepository.update(id, data);
    return { user };
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      return { error: 'A user with this email already exists' };
    }
    throw err;
  }
}

async function deleteUser(id) {
  if (!isValidId(id)) {
    return false;
  }

  return userRepository.remove(id);
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
