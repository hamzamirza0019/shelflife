process.env.JWT_ACCESS_SECRET = "shelflife-test-access-secret";
process.env.JWT_REFRESH_SECRET = "shelflife-test-refresh-secret";
process.env.NODE_ENV = "test";

const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const { register, login, refresh, logout } = require("../controllers/authController");

const userId = new mongoose.Types.ObjectId();

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function runController(controller, req) {
  const res = response();
  try {
    await controller(req, res);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
  return res;
}

async function makeUser(password = "correct-horse-battery") {
  const user = new User({
    _id: userId,
    name: "Library Admin",
    email: "librarian@example.edu",
    password,
    role: "librarian"
  });
  await User.schema.s.hooks.execPre("save", user, []);
  return user;
}

function makeRefreshToken(tokenId) {
  return jwt.sign(
    { userId: userId.toString(), type: "refresh", jti: tokenId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

test("registration hashes passwords and never returns them", async () => {
  const originalCreate = User.create;
  let storedUser;
  User.create = async (fields) => {
    storedUser = await makeUser(fields.password);
    return storedUser;
  };

  try {
    const res = await runController(register, {
      body: { name: "Library Admin", email: "librarian@example.edu", password: "correct-horse-battery" },
      get: () => undefined
    });

    assert.equal(res.statusCode, 201);
    assert.equal("password" in res.body.data, false);
    assert.notEqual(storedUser.password, "correct-horse-battery");
    assert.equal(await bcrypt.compare("correct-horse-battery", storedUser.password), true);
  } finally {
    User.create = originalCreate;
  }
});

test("production librarian registration requires its configured key", async () => {
  const originalCreate = User.create;
  const oldEnvironment = process.env.NODE_ENV;
  const oldKey = process.env.LIBRARIAN_REGISTRATION_KEY;
  let createCalled = false;
  process.env.NODE_ENV = "production";
  process.env.LIBRARIAN_REGISTRATION_KEY = "private-bootstrap-key";
  User.create = async () => {
    createCalled = true;
    return { _id: userId, name: "Library Admin", email: "librarian@example.edu", role: "librarian" };
  };

  try {
    const req = {
      body: { name: "Library Admin", email: "librarian@example.edu", password: "correct-horse-battery" },
      get: () => "wrong-key"
    };
    const denied = await runController(register, req);
    assert.equal(denied.statusCode, 403);
    assert.equal(createCalled, false);

    req.get = (header) => header === "X-Librarian-Registration-Key" ? "private-bootstrap-key" : undefined;
    const allowed = await runController(register, req);
    assert.equal(allowed.statusCode, 201);
    assert.equal(createCalled, true);
  } finally {
    User.create = originalCreate;
    if (oldEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnvironment;
    if (oldKey === undefined) delete process.env.LIBRARIAN_REGISTRATION_KEY;
    else process.env.LIBRARIAN_REGISTRATION_KEY = oldKey;
  }
});

test("login issues short-lived access and refresh tokens without storing either token", async () => {
  const originals = { findOne: User.findOne, create: RefreshToken.create };
  const user = await makeUser();
  const records = [];
  User.findOne = () => ({ select: async () => user });
  RefreshToken.create = async ([record]) => records.push(record);

  try {
    const res = await runController(login, {
      body: { email: user.email, password: "correct-horse-battery" }
    });
    const { accessToken, refreshToken, user: responseUser } = res.body.data;
    const access = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const refreshPayload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    assert.equal(res.statusCode, 200);
    assert.equal(access.type, "access");
    assert.equal(access.userId, userId.toString());
    assert.equal(access.role, "librarian");
    assert.equal(access.exp - access.iat, 15 * 60);
    assert.equal(refreshPayload.type, "refresh");
    assert.equal(refreshPayload.userId, userId.toString());
    assert.equal(refreshPayload.exp - refreshPayload.iat, 7 * 24 * 60 * 60);
    assert.equal(responseUser.email, user.email);
    assert.equal("password" in responseUser, false);
    assert.deepEqual(Object.keys(records[0]).sort(), ["expiresAt", "tokenId", "user"].sort());
    assert.equal(records[0].tokenId, refreshPayload.jti);
    assert.equal("refreshToken" in records[0], false);
  } finally {
    User.findOne = originals.findOne;
    RefreshToken.create = originals.create;
  }
});

test("refresh rotation is atomic and makes the old token unusable", async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOneAndUpdate: RefreshToken.findOneAndUpdate,
    create: RefreshToken.create,
    findById: User.findById
  };
  const tokenId = randomUUID();
  const oldToken = makeRefreshToken(tokenId);
  const records = [{ user: userId, tokenId, expiresAt: new Date(Date.now() + 86400000), revokedAt: null }];
  const user = await makeUser();
  mongoose.startSession = async () => ({
    withTransaction: (operation) => operation(),
    endSession: async () => {}
  });
  RefreshToken.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(options.session !== undefined, true);
    const record = records.find((item) => item.tokenId === filter.tokenId && !item.revokedAt && item.expiresAt > filter.expiresAt.$gt);
    if (!record) return null;
    record.revokedAt = update.$set.revokedAt;
    return record;
  };
  RefreshToken.create = async ([record], options) => {
    assert.equal(options.session !== undefined, true);
    records.push(record);
  };
  User.findById = () => ({ session: async () => user });

  try {
    const requests = [1, 2].map(() => runController(refresh, { body: { refreshToken: oldToken } }));
    const results = await Promise.all(requests);
    const success = results.find((res) => res.statusCode === 200);
    const rejected = results.find((res) => res.statusCode === 401);
    const newPayload = jwt.verify(success.body.data.refreshToken, process.env.JWT_REFRESH_SECRET);

    assert.ok(success);
    assert.ok(rejected);
    assert.equal(records[0].revokedAt instanceof Date, true);
    assert.notEqual(newPayload.jti, tokenId);
    assert.equal(jwt.verify(success.body.data.accessToken, process.env.JWT_ACCESS_SECRET).type, "access");
    assert.equal(records.length, 2);
    assert.equal("refreshToken" in records[1], false);

    const reused = await runController(refresh, { body: { refreshToken: oldToken } });
    assert.equal(reused.statusCode, 401);
    const invalid = await runController(refresh, { body: { refreshToken: "invalid-token" } });
    assert.equal(invalid.statusCode, 401);
    const wrongTypeToken = jwt.sign(
      { userId: userId.toString(), type: "access", jti: randomUUID() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    const wrongType = await runController(refresh, { body: { refreshToken: wrongTypeToken } });
    assert.equal(wrongType.statusCode, 401);
    const expiredToken = jwt.sign(
      { userId: userId.toString(), type: "refresh", jti: randomUUID() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: -1 }
    );
    const expired = await runController(refresh, { body: { refreshToken: expiredToken } });
    assert.equal(expired.statusCode, 401);
  } finally {
    mongoose.startSession = originals.startSession;
    RefreshToken.findOneAndUpdate = originals.findOneAndUpdate;
    RefreshToken.create = originals.create;
    User.findById = originals.findById;
  }
});

test("logout revokes a refresh token and rejects its reuse", async () => {
  const original = RefreshToken.findOneAndUpdate;
  const tokenId = randomUUID();
  const token = makeRefreshToken(tokenId);
  const record = { user: userId, tokenId, expiresAt: new Date(Date.now() + 86400000), revokedAt: null };
  RefreshToken.findOneAndUpdate = async (filter, update) => {
    if (record.tokenId !== filter.tokenId || record.revokedAt || record.expiresAt <= filter.expiresAt.$gt) return null;
    record.revokedAt = update.$set.revokedAt;
    return record;
  };

  try {
    const first = await runController(logout, { body: { refreshToken: token } });
    const second = await runController(logout, { body: { refreshToken: token } });
    assert.equal(first.statusCode, 200);
    assert.equal(record.revokedAt instanceof Date, true);
    assert.equal(second.statusCode, 401);
  } finally {
    RefreshToken.findOneAndUpdate = original;
  }
});