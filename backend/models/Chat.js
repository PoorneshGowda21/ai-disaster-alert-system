const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: [true, "City name is required"],
      trim: true,
      index: true, // Optimized for filtering messages by city
    },
    sender: {
      type: String,
      default: "Anonymous",
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message body cannot be empty"],
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt (used for sorting logs by time)
  }
);

module.exports = mongoose.model("Chat", ChatSchema);
