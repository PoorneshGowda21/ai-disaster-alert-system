const Alert = require("../models/Alert");
const catchAsync = require("../utils/catchAsync");

// Fetch all alerts (sorted newest first)
exports.getAlerts = catchAsync(async (req, res, next) => {
  const alerts = await Alert.find().sort({ createdAt: -1 });

  // Map to frontend-expected legacy formats
  const formattedAlerts = alerts.map((a) => ({
    id: a._id,
    area: a.area,
    level: a.level,
    reason: a.reason,
    sent_at: a.createdAt,
  }));

  res.status(200).json(formattedAlerts);
});
