const express = require("express");
const controller = require("../controllers/borrowController");
const { authenticate, requireRole } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const validator = require("../validators/borrowValidator");

const router = express.Router();
const librarian = [authenticate, requireRole("librarian")];

router.post("/", ...librarian, validate(validator.create), controller.issueBook);
router.post("/return/:borrowId", ...librarian, validate(validator.returnBook), controller.returnBook);

module.exports = router;
