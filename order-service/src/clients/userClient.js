const { userServiceUrl } = require('../config/services');
const { getResource } = require('./serviceClient');

function getUser(userId) {
  return getResource('user-service', userServiceUrl, `/users/${encodeURIComponent(userId)}`, 'User');
}

module.exports = { getUser };
