const mongoose = require("mongoose");
const Book = require("../models/Book");
const BorrowRecord = require("../models/BorrowRecord");
const Member = require("../models/Member");

async function issueBook(req, res) {
	const session = await mongoose.startSession();
	let borrowRecord;
	try {
		await session.withTransaction(async () => {
			const member = await Member.findById(req.body.memberId).session(session);
			if (!member) {
				const error = new Error("Member not found");
				error.status = 404;
				throw error;
			}

			const bookExists = await Book.exists({ _id: req.body.bookId }).session(session);
			if (!bookExists) {
				const error = new Error("Book not found");
				error.status = 404;
				throw error;
			}

			const book = await Book.findOneAndUpdate(
				{ _id: req.body.bookId, availableCopies: { $gt: 0 } },
				{ $inc: { availableCopies: -1 } },
				{ new: true, session }
			);
			if (!book) {
				const error = new Error("Book is currently unavailable");
				error.status = 409;
				throw error;
			}

			const issueDate = new Date();
			const dueDate = new Date(issueDate);
			dueDate.setDate(dueDate.getDate() + 14);
			[borrowRecord] = await BorrowRecord.create([{
				book: book._id,
				member: member._id,
				issueDate,
				dueDate,
				status: "issued"
			}], { session });
		});
		return res.status(201).json({ success: true, data: borrowRecord });
	} finally {
		await session.endSession();
	}
}

async function returnBook(req, res) {
	const session = await mongoose.startSession();
	let borrowRecord;
	try {
		await session.withTransaction(async () => {
			const returnDate = new Date();
			borrowRecord = await BorrowRecord.findOneAndUpdate(
				{ _id: req.params.borrowId, status: { $in: ["issued", "overdue"] }, returnDate: null },
				{ $set: { status: "returned", returnDate } },
				{ new: true, session }
			);

			if (!borrowRecord) {
				const exists = await BorrowRecord.exists({ _id: req.params.borrowId }).session(session);
				const error = new Error(exists ? "This book has already been returned" : "Borrow record not found");
				error.status = exists ? 409 : 404;
				throw error;
			}

			const book = await Book.findOneAndUpdate(
				{ _id: borrowRecord.book, $expr: { $lt: ["$availableCopies", "$totalCopies"] } },
				{ $inc: { availableCopies: 1 } },
				{ new: true, session }
			);
			if (!book) {
				const error = new Error("Book inventory is inconsistent; return was not completed");
				error.status = 409;
				throw error;
			}
		});

		return res.json({ success: true, data: borrowRecord });
	} finally {
		await session.endSession();
	}
}

module.exports = { issueBook, returnBook };
