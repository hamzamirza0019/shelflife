const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const BorrowRecord = require("../models/BorrowRecord");
const Member = require("../models/Member");
const { issueBook, returnBook } = require("../controllers/borrowController");

const bookId = "64c000000000000000000001";
const memberId = "64c000000000000000000002";
const borrowId = "64c000000000000000000003";

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

function mockSession() {
  return {
    withTransaction: (operation) => operation(),
    endSession: async () => {}
  };
}

test("concurrent issues cannot borrow the final copy twice", async () => {
  const original = {
    startSession: mongoose.startSession,
    memberFindById: Member.findById,
    bookExists: Book.exists,
    bookFindOneAndUpdate: Book.findOneAndUpdate,
    borrowCreate: BorrowRecord.create
  };
  let availableCopies = 1;
  let recordCount = 0;

  mongoose.startSession = async () => mockSession();
  Member.findById = () => ({ session: async () => ({ _id: memberId }) });
  Book.exists = () => ({ session: async () => ({ _id: bookId }) });
  Book.findOneAndUpdate = async (filter, update, options) => {
    assert.deepEqual(filter, { _id: bookId, availableCopies: { $gt: 0 } });
    assert.equal(options.session !== undefined, true);
    if (availableCopies === 0) return null;
    availableCopies += update.$inc.availableCopies;
    return { _id: bookId, availableCopies };
  };
  BorrowRecord.create = async ([record], options) => {
    assert.equal(options.session !== undefined, true);
    recordCount += 1;
    return [{ ...record, _id: borrowId }];
  };

  try {
    const requests = [1, 2].map(() => runController(issueBook, { body: { bookId, memberId } }));
    const results = await Promise.all(requests);

    assert.deepEqual(results.map((res) => res.statusCode).sort(), [201, 409]);
    assert.equal(availableCopies, 0);
    assert.equal(recordCount, 1);
  } finally {
    mongoose.startSession = original.startSession;
    Member.findById = original.memberFindById;
    Book.exists = original.bookExists;
    Book.findOneAndUpdate = original.bookFindOneAndUpdate;
    BorrowRecord.create = original.borrowCreate;
  }
});

test("repeated returns restore a copy only once", async () => {
  const original = {
    startSession: mongoose.startSession,
    borrowFindOneAndUpdate: BorrowRecord.findOneAndUpdate,
    borrowExists: BorrowRecord.exists,
    bookFindOneAndUpdate: Book.findOneAndUpdate
  };
  const totalCopies = 1;
  let availableCopies = 0;
  let status = "issued";

  mongoose.startSession = async () => mockSession();
  BorrowRecord.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(options.session !== undefined, true);
    if (status !== "issued" || filter.returnDate !== null) return null;
    status = update.$set.status;
    return { _id: borrowId, book: bookId, status, dueDate: new Date(Date.now() + 86400000) };
  };
  BorrowRecord.exists = () => ({ session: async () => ({ _id: borrowId }) });
  Book.findOneAndUpdate = async (filter, update, options) => {
    assert.deepEqual(filter.$expr, { $lt: ["$availableCopies", "$totalCopies"] });
    assert.equal(options.session !== undefined, true);
    if (availableCopies >= totalCopies) return null;
    availableCopies += update.$inc.availableCopies;
    return { _id: bookId, availableCopies };
  };

  try {
    const requests = [1, 2].map(() => runController(returnBook, { params: { borrowId } }));
    const results = await Promise.all(requests);

    assert.deepEqual(results.map((res) => res.statusCode).sort(), [200, 409]);
    assert.equal(availableCopies, totalCopies);
    assert.equal(status, "returned");
  } finally {
    mongoose.startSession = original.startSession;
    BorrowRecord.findOneAndUpdate = original.borrowFindOneAndUpdate;
    BorrowRecord.exists = original.borrowExists;
    Book.findOneAndUpdate = original.bookFindOneAndUpdate;
  }
});