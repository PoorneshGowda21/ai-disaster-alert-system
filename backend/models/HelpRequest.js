const { mongoose } = require("../db");

const HelpRequestSchema = new mongoose.Schema({
  type: { type: String, enum: ["request", "offer"], required: true },
  category: { type: String, enum: ["food", "water", "medical", "shelter", "utility", "other"], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  city: { type: String, required: true, index: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  contactName: { type: String, required: true },
  contactPhone: { type: String, required: true },
  status: { type: String, enum: ["open", "resolved"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HelpRequest", HelpRequestSchema);
