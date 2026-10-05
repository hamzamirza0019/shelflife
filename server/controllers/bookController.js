const Book = require("../models/Book");
const BorrowRecord = require("../models/BorrowRecord");

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createBook(req, res) {
	const book = await Book.create({
		...req.body,
		availableCopies: req.body.totalCopies
	});
	return res.status(201).json({ success: true, data: book });
}

async function listBooks(req, res) {
	const { page, limit, genre, search } = req.validatedQuery;
	const filter = {};
	if (genre) filter.genre = genre;
	if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };

	const [books, total] = await Promise.all([
		Book.find(filter).sort({ title: 1 }).skip((page - 1) * limit).limit(limit),
		Book.countDocuments(filter)
	]);

	return res.json({
		success: true,
		data: books,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
	});
}

async function getBook(req, res) {
	const book = await Book.findById(req.params.id);
	if (!book) return res.status(404).json({ success: false, message: "Book not found" });
	return res.json({ success: true, data: book });
}

async function updateBook(req, res) {
	const book = await Book.findById(req.params.id);
	if (!book) return res.status(404).json({ success: false, message: "Book not found" });

	const changes = { ...req.body };
	if (changes.totalCopies !== undefined) {
		const checkedOut = book.totalCopies - book.availableCopies;
		if (changes.totalCopies < checkedOut) {
			return res.status(409).json({ success: false, message: "totalCopies cannot be less than checked-out copies" });
		}
		changes.availableCopies = changes.totalCopies - checkedOut;

		const updatedBook = await Book.findOneAndUpdate(
			{ _id: book._id, totalCopies: book.totalCopies, availableCopies: book.availableCopies },
			{ $set: changes },
			{ new: true, runValidators: true }
		);
		if (!updatedBook) {
			return res.status(409).json({ success: false, message: "Book inventory changed; retry the update" });
		}
		return res.json({ success: true, data: updatedBook });
	}

	const updatedBook = await Book.findByIdAndUpdate(book._id, { $set: changes }, { new: true, runValidators: true });
	return res.json({ success: true, data: updatedBook });
}

async function deleteBook(req, res) {
	const book = await Book.findById(req.params.id);
	if (!book) return res.status(404).json({ success: false, message: "Book not found" });

	const activeBorrow = await BorrowRecord.exists({
		book: book._id,
		status: { $in: ["issued", "overdue"] },
		returnDate: null
	});
	if (activeBorrow) {
		return res.status(409).json({ success: false, message: "Cannot delete a book with active borrow records" });
	}

	const deletion = await Book.deleteOne({ _id: book._id, availableCopies: book.totalCopies });
	if (deletion.deletedCount !== 1) {
		return res.status(409).json({ success: false, message: "Cannot delete a book while copies are being borrowed" });
	}
	return res.json({ success: true, data: { message: "Book deleted" } });
}

module.exports = { createBook, listBooks, getBook, updateBook, deleteBook };
