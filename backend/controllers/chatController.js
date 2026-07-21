const Chat = require("../models/Chat");
const catchAsync = require("../utils/catchAsync");

// Fetch the last 50 chat messages for a specific city
exports.getChatsByCity = catchAsync(async (req, res, next) => {
  const { city } = req.params;

  const messages = await Chat.find({
    city: { $regex: new RegExp("^" + city + "$", "i") },
  })
    .sort({ createdAt: -1 }) // Get the latest ones first
    .limit(50);

  // Reverse to chronological order (oldest first) so it reads normally in chat UI
  res.status(200).json(messages.reverse());
});
