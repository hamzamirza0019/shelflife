const { Joi, objectId, paginationQuery } = require("./commonValidator");

const create = {
  body: Joi.object({
    bookId: objectId.required(),
    memberId: objectId.required()
  }).unknown(false)
};

const returnBook = {
  params: Joi.object({ borrowId: objectId.required() }).unknown(false)
};

const list = {
  query: paginationQuery({
    status: Joi.string().valid("issued", "overdue"),
    search: Joi.string().trim().max(200),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso()
  })
};

const history = {
  query: paginationQuery({
    status: Joi.string().valid("issued", "returned", "overdue"),
    search: Joi.string().trim().max(200),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso()
  })
};

module.exports = { create, returnBook, list, history };