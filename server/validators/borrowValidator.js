const { Joi, objectId } = require("./commonValidator");

const create = {
  body: Joi.object({
    bookId: objectId.required(),
    memberId: objectId.required()
  }).unknown(false)
};

const returnBook = {
  params: Joi.object({ borrowId: objectId.required() }).unknown(false)
};

module.exports = { create, returnBook };