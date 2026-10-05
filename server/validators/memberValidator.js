const { Joi, objectId, paginationQuery } = require("./commonValidator");

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    email: Joi.string().trim().email().max(254).required(),
    membershipId: Joi.string().trim().min(1).max(64).required()
  }).unknown(false)
};

const update = {
  params: Joi.object({ id: objectId.required() }).unknown(false),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    email: Joi.string().trim().lowercase().email().max(254),
    membershipId: Joi.string().trim().min(1).max(64)
  }).min(1).unknown(false)
};

const byId = { params: Joi.object({ id: objectId.required() }).unknown(false) };

const list = {
  query: paginationQuery({ search: Joi.string().trim().max(200) })
};

module.exports = { create, update, byId, list };