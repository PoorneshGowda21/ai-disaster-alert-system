const { mongoose } = require("../db");

const ReportSchema = new mongoose.Schema({
  type: { type: String, required: true },
  severity: { type: String },
  description: { type: String },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  city: { type: String, required: true, index: true },
  submittedBy: { type: String, default: "Anonymous" },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", ReportSchema);
