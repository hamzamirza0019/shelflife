process.env.JWT_ACCESS_SECRET = "shelflife-member-borrow-test-secret";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const jwt = require("jsonwebtoken");
const Book = require("../models/Book");
const BorrowRecord = require("../models/BorrowRecord");
const Member = require("../models/Member");
const app = require("../app");

const memberId = "64c000000000000000000002";
const librarianId = "64c000000000000000000004";
const bookId = "64c000000000000000000001";

let server;
let baseUrl;

function librarianToken() {
  return jwt.sign({ userId: librarianId, role: "librarian", type: "access" }, process.env.JWT_ACCESS_SECRET);
}

function memberToken() {
  return jwt.sign({ userId: memberId, role: "member", type: "access" }, process.env.JWT_ACCESS_SECRET);
}

function createQuery(records) {
  return {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    exec: async () => records
  };
}

function populatedRecord({ status = "issued", dueDate = new Date("2026-10-20T00:00:00.000Z") } = {}) {
  return {
    toObject() {
      return {
        _id: "64c000000000000000000003",
        book: { _id: bookId, title: "Dune", author: "Frank Herbert", ISBN: "9780441172719" },
        member: { _id: memberId, name: "Nora Patel", membershipId: "SL-240418" },
        issueDate: new Date("2026-10-01T12:00:00.000Z"),
        dueDate,
        returnDate: null,
        status
      };
    }
  };
}

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

test("member update requires librarian access and validates the existing member fields", async () => {
  const originalUpdate = Member.findByIdAndUpdate;
  let updateArgs;
  Member.findByIdAndUpdate = async (...args) => {
    updateArgs = args;
    return { _id: memberId, name: "Nora Patel", email: "nora.updated@example.edu", membershipId: "SL-240418" };
  };

  try {
    const unauthenticated = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nora Patel" })
    });
    assert.equal(unauthenticated.status, 401);

    const forbidden = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${memberToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nora Patel" })
    });
    assert.equal(forbidden.status, 403);

    const invalid = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${librarianToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "555-0100" })
    });
    assert.equal(invalid.status, 400);

    const updated = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${librarianToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "NORA.UPDATED@example.edu" })
    });
    const payload = await updated.json();
    assert.equal(updated.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.data.email, "nora.updated@example.edu");
    assert.deepEqual(updateArgs, [memberId, { $set: { email: "nora.updated@example.edu" } }, { new: true, runValidators: true }]);
  } finally {
    Member.findByIdAndUpdate = originalUpdate;
  }
});

test("member update and delete return not found and duplicate errors keep standard responses", async () => {
  const originals = {
    findByIdAndUpdate: Member.findByIdAndUpdate,
    findById: Member.findById,
    exists: BorrowRecord.exists
  };
  Member.findByIdAndUpdate = async () => null;
  Member.findById = async () => null;

  try {
    const updated = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${librarianToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nora P." })
    });
    assert.equal(updated.status, 404);
    assert.equal((await updated.json()).message, "Member not found");

    const deleted = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${librarianToken()}` }
    });
    assert.equal(deleted.status, 404);
    assert.equal((await deleted.json()).message, "Member not found");

    Member.findByIdAndUpdate = async () => {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    };
    const duplicate = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${librarianToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "taken@example.edu" })
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).success, false);
  } finally {
    Member.findByIdAndUpdate = originals.findByIdAndUpdate;
    Member.findById = originals.findById;
    BorrowRecord.exists = originals.exists;
  }
});

test("member deletion is blocked when any borrowing history would be orphaned", async () => {
  const originals = { findById: Member.findById, exists: BorrowRecord.exists };
  let deleteCalled = false;
  Member.findById = async () => ({ _id: memberId, deleteOne: async () => { deleteCalled = true; } });
  BorrowRecord.exists = async (filter) => {
    assert.deepEqual(filter, { member: memberId });
    return { _id: "64c000000000000000000003", status: "returned" };
  };

  try {
    const unauthenticated = await fetch(`${baseUrl}/api/members/${memberId}`, { method: "DELETE" });
    assert.equal(unauthenticated.status, 401);

    const forbidden = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${memberToken()}` }
    });
    assert.equal(forbidden.status, 403);

    const response = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${librarianToken()}` }
    });
    const payload = await response.json();
    assert.equal(response.status, 409);
    assert.equal(payload.success, false);
    assert.match(payload.message, /borrowing history/);
    assert.equal(deleteCalled, false);
  } finally {
    Member.findById = originals.findById;
    BorrowRecord.exists = originals.exists;
  }
});

test("member deletion succeeds only when no borrowing records exist", async () => {
  const originals = { findById: Member.findById, exists: BorrowRecord.exists };
  let deleteCalled = false;
  Member.findById = async () => ({ _id: memberId, deleteOne: async () => { deleteCalled = true; } });
  BorrowRecord.exists = async () => null;

  try {
    const response = await fetch(`${baseUrl}/api/members/${memberId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${librarianToken()}` }
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.data.message, "Member deleted");
    assert.equal(deleteCalled, true);
  } finally {
    Member.findById = originals.findById;
    BorrowRecord.exists = originals.exists;
  }
});

test("current borrowing returns paginated populated records and derives overdue status", async () => {
  const originals = { find: BorrowRecord.find, countDocuments: BorrowRecord.countDocuments };
  let capturedFilter;
  BorrowRecord.find = (filter) => {
    capturedFilter = filter;
    return createQuery([populatedRecord({ dueDate: new Date("2026-09-30T00:00:00.000Z") })]);
  };
  BorrowRecord.countDocuments = async (filter) => {
    assert.deepEqual(filter, capturedFilter);
    return 17;
  };

  try {
    const response = await fetch(`${baseUrl}/api/borrow?page=2&limit=5`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(payload.pagination, { page: 2, limit: 5, total: 17, totalPages: 4 });
    assert.deepEqual(capturedFilter, { returnDate: null, status: { $in: ["issued", "overdue"] } });
    assert.equal(payload.data[0]._id, "64c000000000000000000003");
    assert.equal(payload.data[0].book.title, "Dune");
    assert.equal(payload.data[0].member.name, "Nora Patel");
    assert.equal(payload.data[0].status, "overdue");
  } finally {
    BorrowRecord.find = originals.find;
    BorrowRecord.countDocuments = originals.countDocuments;
  }
});

test("borrowing history supports status, search, dates, and rejects invalid filters", async () => {
  const originals = {
    find: BorrowRecord.find,
    countDocuments: BorrowRecord.countDocuments,
    bookDistinct: Book.distinct,
    memberDistinct: Member.distinct
  };
  let capturedFilter;
  Book.distinct = async (field, filter) => {
    assert.equal(field, "_id");
    assert.equal(filter.$or[0].title.source, "Dune");
    return [bookId];
  };
  Member.distinct = async () => [memberId];
  BorrowRecord.find = (filter) => {
    capturedFilter = filter;
    return createQuery([populatedRecord({ status: "returned" })]);
  };
  BorrowRecord.countDocuments = async () => 1;

  try {
    const response = await fetch(`${baseUrl}/api/borrow/history?page=1&limit=10&status=returned&search=Dune&fromDate=2026-10-01&toDate=2026-10-03`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.data[0].status, "returned");
    assert.equal(payload.data[0].returnDate, null);
    assert.ok(capturedFilter.$and.some((item) => item.issueDate?.$lte?.toISOString() === "2026-10-03T23:59:59.999Z"));
    assert.ok(capturedFilter.$and.some((item) => item.$or?.[0]?.book?.$in?.[0] === bookId));

    const invalid = await fetch(`${baseUrl}/api/borrow/history?status=missing`);
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).success, false);

    const unauthorized = await fetch(`${baseUrl}/api/borrow/history?status=overdue`);
    assert.equal(unauthorized.status, 200);
  } finally {
    BorrowRecord.find = originals.find;
    BorrowRecord.countDocuments = originals.countDocuments;
    Book.distinct = originals.bookDistinct;
    Member.distinct = originals.memberDistinct;
  }
});