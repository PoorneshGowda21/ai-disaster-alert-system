const { mongoose } = require("../db");

const AlertSchema = new mongoose.Schema({
  area: { type: String, required: true, index: true },
  level: { type: String, required: true },
  reason: { type: String },
  sent_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Alert", AlertSchema);
