const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
  {
    area: {
      type: String,
      required: [true, "Area/City is required"],
      trim: true,
      index: true,
    },
    level: {
      type: String,
      required: true,
      enum: ["LOW", "MODERATE", "HIGH"],
      default: "HIGH",
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Alert", AlertSchema);
