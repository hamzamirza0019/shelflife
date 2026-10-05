const { Joi } = require("./commonValidator");

const register = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
    password: Joi.string().min(8).max(128).required()
  }).unknown(false)
};

const login = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email().max(254).required(),
    password: Joi.string().min(1).max(128).required()
  }).unknown(false)
};

const refresh = {
  body: Joi.object({
    refreshToken: Joi.string().required()
  }).unknown(false)
};

module.exports = { register, login, refresh };