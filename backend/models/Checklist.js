const { mongoose } = require("../db");

const ChecklistSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  items: [
    {
      text: { type: String, required: true },
      checked: { type: Boolean, default: false }
    }
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Checklist", ChecklistSchema);
