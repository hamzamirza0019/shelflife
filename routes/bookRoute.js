const express = require("express");
const controller = require("../controllers/bookController");
const { authenticate, requireRole } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const validator = require("../validators/bookValidator");

const router = express.Router();
const librarian = [authenticate, requireRole("librarian")];

router.get("/", validate(validator.list), controller.listBooks);
router.get("/:id", validate(validator.byId), controller.getBook);
router.post("/", ...librarian, validate(validator.create), controller.createBook);
router.patch("/:id", ...librarian, validate(validator.update), controller.updateBook);
router.delete("/:id", ...librarian, validate(validator.byId), controller.deleteBook);

module.exports = router;
