process.env.JWT_ACCESS_SECRET = "shelflife-test-access-secret";
process.env.JWT_REFRESH_SECRET = "shelflife-test-refresh-secret";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const jwt = require("jsonwebtoken");
const Book = require("../models/Book");
const app = require("../app");

let server;
let baseUrl;

Book.find = (filter) => {
  assert.deepEqual(filter, {
    genre: "Fiction",
    title: { $regex: "harry", $options: "i" }
  });
  return {
    sort() { return this; },
    skip(value) { assert.equal(value, 5); return this; },
    limit(value) { assert.equal(value, 5); return Promise.resolve([]); }
  };
};
Book.countDocuments = async () => 21;
Book.create = async (book) => ({ _id: "64c000000000000000000001", ...book });

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("validated pagination reaches book queries as normalized values", async () => {
  const response = await fetch(`${baseUrl}/api/books?genre=Fiction&search=harry&page=2&limit=5`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.pagination, { page: 2, limit: 5, total: 21, totalPages: 5 });
});

test("invalid IDs and librarian access are rejected consistently", async () => {
  const invalidId = await fetch(`${baseUrl}/api/books/not-an-object-id`);
  assert.equal(invalidId.status, 400);

  const noToken = await fetch(`${baseUrl}/api/books`, { method: "POST" });
  assert.equal(noToken.status, 401);

  const invalidToken = await fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { Authorization: "Bearer invalid" }
  });
  assert.equal(invalidToken.status, 401);

  const memberToken = jwt.sign(
    { userId: "64c000000000000000000002", role: "member", type: "access" },
    process.env.JWT_ACCESS_SECRET
  );
  const forbidden = await fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { Authorization: `Bearer ${memberToken}` }
  });
  assert.equal(forbidden.status, 403);

  const librarianToken = jwt.sign(
    { userId: "64c000000000000000000002", role: "librarian", type: "access" },
    process.env.JWT_ACCESS_SECRET
  );
  const invalidBody = await fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { Authorization: `Bearer ${librarianToken}`, "Content-Type": "application/json" },
    body: "{}"
  });
  assert.equal(invalidBody.status, 400);

  const refreshToken = jwt.sign(
    { userId: "64c000000000000000000002", type: "refresh", jti: "test-refresh-id" },
    process.env.JWT_REFRESH_SECRET
  );
  const refreshAsAccess = await fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` }
  });
  assert.equal(refreshAsAccess.status, 401);

  const expiredToken = jwt.sign(
    { userId: "64c000000000000000000002", role: "librarian", type: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: -1 }
  );
  const expired = await fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert.equal(expired.status, 401);

  const created = await fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { Authorization: `Bearer ${librarianToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Book", author: "Test Author", ISBN: "TEST-1", genre: "Fiction", totalCopies: 1
    })
  });
  assert.equal(created.status, 201);

  for (const [path, body] of [
    ["/api/members", "{}"],
    ["/api/borrow", "{}"],
    ["/api/borrow/return/not-an-object-id", undefined]
  ]) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${librarianToken}`, "Content-Type": "application/json" },
      body
    });
    assert.equal(response.status, 400, `${path} should authenticate before validating input`);
  }

  const wrongTypeToken = jwt.sign(
    { userId: "64c000000000000000000002", role: "librarian", type: "refresh" },
    process.env.JWT_ACCESS_SECRET
  );
  const wrongType = await fetch(`${baseUrl}/api/books`, {
    method: "POST",
    headers: { Authorization: `Bearer ${wrongTypeToken}` }
  });
  assert.equal(wrongType.status, 401);

  const missingRefresh = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  assert.equal(missingRefresh.status, 401);
});