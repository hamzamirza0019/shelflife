const mongoose = require("mongoose");
const Book = require("../models/Book");
const BorrowRecord = require("../models/BorrowRecord");
const Member = require("../models/Member");

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildBorrowFilter(query, { currentOnly }) {
	const clauses = [];
	const now = new Date();

	if (currentOnly) {
		if (query.status === "overdue") {
			clauses.push({
				returnDate: null,
				$or: [
					{ status: "overdue" },
					{ status: "issued", dueDate: { $lt: now } }
				]
			});
		} else if (query.status === "issued") {
			clauses.push({ returnDate: null, status: "issued", dueDate: { $gte: now } });
		} else {
			clauses.push({ returnDate: null, status: { $in: ["issued", "overdue"] } });
		}
	} else if (query.status === "overdue") {
		clauses.push({
			returnDate: null,
			$or: [
				{ status: "overdue" },
				{ status: "issued", dueDate: { $lt: now } }
			]
		});
	} else if (query.status === "issued") {
		clauses.push({ returnDate: null, status: "issued", dueDate: { $gte: now } });
	} else if (query.status) {
		clauses.push({ status: query.status });
	}

	if (query.fromDate || query.toDate) {
		const issueDate = {};
		if (query.fromDate) issueDate.$gte = query.fromDate;
		if (query.toDate) {
			const toDate = new Date(query.toDate);
			toDate.setUTCHours(23, 59, 59, 999);
			issueDate.$lte = toDate;
		}
		clauses.push({ issueDate });
	}

	if (query.search) {
		const search = new RegExp(escapeRegex(query.search), "i");
		const [bookIds, memberIds] = await Promise.all([
			Book.distinct("_id", { $or: [{ title: search }, { author: search }, { ISBN: search }] }),
			Member.distinct("_id", { $or: [{ name: search }, { email: search }, { membershipId: search }] })
		]);
		const searchClauses = [{ book: { $in: bookIds } }, { member: { $in: memberIds } }];
		if (mongoose.isValidObjectId(query.search)) searchClauses.push({ _id: query.search });
		clauses.push({ $or: searchClauses });
	}

	if (clauses.length === 0) return {};
	return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

function deriveOverdueStatus(records) {
	const now = new Date();
	return records.map((record) => {
		const data = record.toObject();
		if (data.status === "issued" && !data.returnDate && data.dueDate < now) {
			data.status = "overdue";
		}
		return data;
	});
}

async function listBorrowingRecords(req, res, { currentOnly }) {
	const { page, limit } = req.validatedQuery;
	const filter = await buildBorrowFilter(req.validatedQuery, { currentOnly });
	const [records, total] = await Promise.all([
		BorrowRecord.find(filter)
			.populate("book", "title author ISBN genre totalCopies availableCopies")
			.populate("member", "name email membershipId")
			.sort({ issueDate: -1, _id: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.exec(),
		BorrowRecord.countDocuments(filter)
	]);

	return res.json({
		success: true,
		data: deriveOverdueStatus(records),
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
	});
}

async function listCurrentBorrowing(req, res) {
	return listBorrowingRecords(req, res, { currentOnly: true });
}

async function listBorrowingHistory(req, res) {
	return listBorrowingRecords(req, res, { currentOnly: false });
}

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

module.exports = { listCurrentBorrowing, listBorrowingHistory, issueBook, returnBook };
