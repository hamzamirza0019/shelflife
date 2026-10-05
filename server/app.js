const cors = require("cors");
const express = require("express");
const authRoutes = require("./routes/authRoute");
const bookRoutes = require("./routes/bookRoute");
const borrowRoutes = require("./routes/borrowRoute");
const memberRoutes = require("./routes/memberRoute");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./middlewares/logger");

const app = express();
const clientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === "production" ? false : "http://localhost:5173");

app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: "1mb" }));
app.use(logger);

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/borrow", borrowRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;