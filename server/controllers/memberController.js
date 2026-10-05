const Member = require("../models/Member");
const BorrowRecord = require("../models/BorrowRecord");

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createMember(req, res) {
	const member = await Member.create(req.body);
	return res.status(201).json({ success: true, data: member });
}

async function listMembers(req, res) {
	const { page, limit, search } = req.validatedQuery;
	const filter = search
		? { $or: [
				{ name: { $regex: escapeRegex(search), $options: "i" } },
				{ email: { $regex: escapeRegex(search), $options: "i" } },
				{ membershipId: { $regex: escapeRegex(search), $options: "i" } }
			] }
		: {};

	const [members, total] = await Promise.all([
		Member.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
		Member.countDocuments(filter)
	]);

	return res.json({
		success: true,
		data: members,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
	});
}

async function getMember(req, res) {
	const member = await Member.findById(req.params.id);
	if (!member) return res.status(404).json({ success: false, message: "Member not found" });
	return res.json({ success: true, data: member });
}

async function getMemberHistory(req, res) {
	const member = await Member.findById(req.params.id);
	if (!member) return res.status(404).json({ success: false, message: "Member not found" });

	await BorrowRecord.updateMany(
		{ member: member._id, status: "issued", dueDate: { $lt: new Date() }, returnDate: null },
		{ $set: { status: "overdue" } }
	);
	const history = await BorrowRecord.find({ member: member._id })
		.populate("book", "title author ISBN genre")
		.sort({ createdAt: -1 });

	return res.json({ success: true, data: history });
}

module.exports = { createMember, listMembers, getMember, getMemberHistory };
