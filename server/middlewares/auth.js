const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
	const authorization = req.get("Authorization");
	const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

	if (!token) {
		return res.status(401).json({ success: false, message: "Authentication required" });
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
		if (payload.type !== "access" || typeof payload.userId !== "string") {
			return res.status(401).json({ success: false, message: "Invalid or expired token" });
		}
		req.user = payload;
		return next();
	} catch {
		return res.status(401).json({ success: false, message: "Invalid or expired token" });
	}
}

function requireRole(role) {
	return (req, res, next) => {
		if (req.user?.role !== role) {
			return res.status(403).json({ success: false, message: "Insufficient permissions" });
		}
		return next();
	};
}

module.exports = { authenticate, requireRole };
