function errorHandler(error, req, res, next) {
	if (res.headersSent) return next(error);

	let status = error.status || error.statusCode || 500;
	let message = error.message;

	if (error.code === 11000) {
		status = 409;
		message = "A record with that value already exists";
	} else if (error.name === "ValidationError" || error.name === "CastError" || error.type === "entity.parse.failed") {
		status = 400;
		message = error.name === "ValidationError" ? error.message : "Invalid request";
	}

	if (status >= 500) {
		console.error(error);
		message = process.env.NODE_ENV === "production" ? "Internal server error" : message || "Internal server error";
	}

	return res.status(status).json({ success: false, message: message || "Request failed" });
}

module.exports = errorHandler;
