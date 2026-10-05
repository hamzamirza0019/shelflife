require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/db");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
	if (!process.env.MONGODB_URI) {
		throw new Error("MONGODB_URI is required");
	}
	if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
		throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required");
	}
	if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
		throw new Error("JWT access and refresh secrets must be different");
	}

	await connectDatabase();
	app.listen(port, () => console.log(`ShelfLife API listening on port ${port}`));
}

startServer().catch((error) => {
	console.error("Failed to start ShelfLife API:", error.message);
	process.exitCode = 1;
});
