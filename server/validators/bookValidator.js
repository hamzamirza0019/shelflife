const { Joi, objectId, paginationQuery } = require("./commonValidator");

const create = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    author: Joi.string().trim().min(1).max(150).required(),
    ISBN: Joi.string().trim().min(1).max(32).required(),
    genre: Joi.string().trim().min(1).max(80).required(),
    totalCopies: Joi.number().integer().min(1).required()
  }).unknown(false)
};

const update = {
  params: Joi.object({ id: objectId.required() }).unknown(false),
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200),
    author: Joi.string().trim().min(1).max(150),
    ISBN: Joi.string().trim().min(1).max(32),
    genre: Joi.string().trim().min(1).max(80),
    totalCopies: Joi.number().integer().min(1)
  }).min(1).unknown(false)
};

const byId = { params: Joi.object({ id: objectId.required() }).unknown(false) };

const list = {
  query: paginationQuery({
    genre: Joi.string().trim().max(80),
    search: Joi.string().trim().max(200)
  })
};

module.exports = { create, update, byId, list };