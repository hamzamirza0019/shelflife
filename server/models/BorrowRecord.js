const mongoose = require("mongoose");

const borrowSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    returnDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["issued", "returned", "overdue"],
      default: "issued"
    }
  },
  { timestamps: true }
);

borrowSchema.index({ member: 1, createdAt: -1 });
borrowSchema.index({ book: 1 });
borrowSchema.index({ status: 1 });
borrowSchema.index({ dueDate: 1 });

module.exports = mongoose.model("BorrowRecord", borrowSchema);
