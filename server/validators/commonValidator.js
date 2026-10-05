const Joi = require("joi");

const objectId = Joi.string().hex().length(24);

function paginationQuery(extra = {}) {
  return Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    ...extra
  }).unknown(false);
}

module.exports = { Joi, objectId, paginationQuery };