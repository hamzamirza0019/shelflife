function validate(schema) {
	return (req, res, next) => {
		const values = {};
		const errors = [];

		for (const key of ["body", "params", "query"]) {
			if (!schema[key]) continue;
			const { error, value } = schema[key].validate(req[key], {
				abortEarly: false,
				convert: true
			});
			if (error) {
				errors.push(...error.details.map((detail) => detail.message));
			} else {
				values[key] = value;
			}
		}

		if (errors.length) {
			return res.status(400).json({ success: false, message: errors.join("; ") });
		}

		if (values.query) req.validatedQuery = values.query;
		if (values.body) req.body = values.body;
		if (values.params) req.params = values.params;
		return next();
	};
}

module.exports = validate;
