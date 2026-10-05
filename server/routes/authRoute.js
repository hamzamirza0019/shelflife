const express = require("express");
const { register, login, refresh, logout } = require("../controllers/authController");
const validate = require("../middlewares/validate");
const authValidator = require("../validators/authValidator");

const router = express.Router();

function requireRefreshToken(req, res, next) {
	if (typeof req.body?.refreshToken !== "string" || !req.body.refreshToken.trim()) {
		return res.status(401).json({ success: false, message: "Refresh token is required" });
	}
	return next();
}

router.post("/register", validate(authValidator.register), register);
router.post("/login", validate(authValidator.login), login);
router.post("/refresh", requireRefreshToken, validate(authValidator.refresh), refresh);
router.post("/logout", requireRefreshToken, validate(authValidator.refresh), logout);

module.exports = router;
