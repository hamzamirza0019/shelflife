const { randomUUID, timingSafeEqual } = require("node:crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");

function registrationAllowed(req) {
  if (process.env.NODE_ENV !== "production") return true;

  const expected = process.env.LIBRARIAN_REGISTRATION_KEY;
  const supplied = req.get("X-Librarian-Registration-Key") || "";
  if (!expected) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function unauthorizedRefresh() {
  const error = new Error("Invalid, expired, or revoked refresh token");
  error.status = 401;
  return error;
}

function verifyRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw unauthorizedRefresh();
  }

  if (payload.type !== "refresh" || typeof payload.userId !== "string" || typeof payload.jti !== "string") {
    throw unauthorizedRefresh();
  }
  return payload;
}

async function createTokenPair(user, session) {
  const userId = user._id.toString();
  const tokenId = randomUUID();
  const accessToken = jwt.sign(
    { userId, role: user.role, type: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
  const refreshToken = jwt.sign(
    { userId, type: "refresh", jti: tokenId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
  const expiresAt = new Date(jwt.decode(refreshToken).exp * 1000);
  const options = session ? { session } : undefined;

  await RefreshToken.create([{ user: user._id, tokenId, expiresAt }], options);
  return { accessToken, refreshToken };
}

async function register(req, res) {
  if (!registrationAllowed(req)) {
    return res.status(403).json({ success: false, message: "Librarian registration is not authorized" });
  }

  const user = await User.create({ ...req.body, role: "librarian" });
  return res.status(201).json({
    success: true,
    data: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
}

async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select("+password");
  if (!user || !(await user.comparePassword(req.body.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const tokens = await createTokenPair(user);

  return res.json({
    success: true,
    data: {
      ...tokens,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    }
  });
}

async function refresh(req, res) {
  const payload = verifyRefreshToken(req.body.refreshToken);
  const session = await mongoose.startSession();
  let tokens;

  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const revoked = await RefreshToken.findOneAndUpdate(
        {
          user: payload.userId,
          tokenId: payload.jti,
          revokedAt: null,
          expiresAt: { $gt: now }
        },
        { $set: { revokedAt: now } },
        { new: false, session }
      );
      if (!revoked) throw unauthorizedRefresh();

      const user = await User.findById(payload.userId).session(session);
      if (!user) throw unauthorizedRefresh();
      tokens = await createTokenPair(user, session);
    });
  } finally {
    await session.endSession();
  }

  return res.json({ success: true, data: tokens });
}

async function logout(req, res) {
  const payload = verifyRefreshToken(req.body.refreshToken);
  const revoked = await RefreshToken.findOneAndUpdate(
    {
      user: payload.userId,
      tokenId: payload.jti,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );

  if (!revoked) throw unauthorizedRefresh();
  return res.json({ success: true, data: { message: "Logged out" } });
}

module.exports = { register, login, refresh, logout };