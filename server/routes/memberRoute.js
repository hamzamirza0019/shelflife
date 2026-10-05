const express = require("express");
const controller = require("../controllers/memberController");
const { authenticate, requireRole } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const validator = require("../validators/memberValidator");

const router = express.Router();

router.get("/", validate(validator.list), controller.listMembers);
router.post("/", authenticate, requireRole("librarian"), validate(validator.create), controller.createMember);
router.get("/:id/history", validate(validator.byId), controller.getMemberHistory);
router.get("/:id", validate(validator.byId), controller.getMember);

module.exports = router;
