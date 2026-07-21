const mongoose = require("mongoose");

const PredictionSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true,
    },
    rainfall: {
      type: Number,
      required: true,
    },
    reportsCount: {
      type: Number,
      required: true,
    },
    risk: {
      type: String,
      required: true,
      enum: ["LOW", "MODERATE", "HIGH"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prediction", PredictionSchema);
