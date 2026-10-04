const userService = require('../services/userService');

async function list(req, res, next) {
  try {
    res.status(200).json(await userService.listUsers());
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const user = await userService.getUser(req.params.id);
    return user ? res.status(200).json(user) : res.status(404).json({ error: 'User not found' });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await userService.createUser(req.body);
    return result.error ? res.status(400).json({ error: result.error }) : res.status(201).json(result.user);
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  return updateUser(req, res, next, false);
}

function patch(req, res, next) {
  return updateUser(req, res, next, true);
}

async function updateUser(req, res, next, partial) {
  try {
    const result = await userService.updateUser(req.params.id, req.body, partial);

    if (result.notFound) {
      return res.status(404).json({ error: 'User not found' });
    }

    return result.error ? res.status(400).json({ error: result.error }) : res.status(200).json(result.user);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await userService.deleteUser(req.params.id);
    return deleted ? res.status(204).send() : res.status(404).json({ error: 'User not found' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, patch, remove };
