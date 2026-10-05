const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      required: true,
      trim: true
    },
    ISBN: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    genre: {
      type: String,
      required: true,
      trim: true
    },
    totalCopies: {
      type: Number,
      required: true,
      min: 1
    },
    availableCopies: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { timestamps: true }
);

bookSchema.path("availableCopies").validate(function (value) {
  return value <= this.totalCopies;
}, "availableCopies cannot exceed totalCopies");

bookSchema.index({ genre: 1 });

module.exports = mongoose.model("Book", bookSchema);