const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Incident type is required"],
      enum: ["Flood", "Fire", "Landslide", "Earthquake", "Storm", "Other"],
    },
    severity: {
      type: String,
      required: [true, "Severity level is required"],
      enum: ["Low", "Moderate", "High", "Critical"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // Note: [longitude, latitude] format
        required: true,
      },
    },
    submittedBy: {
      type: String,
      default: "Anonymous",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index or specific indexes
ReportSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Report", ReportSchema);
