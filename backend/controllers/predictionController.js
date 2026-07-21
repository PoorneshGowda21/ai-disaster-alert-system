const axios = require("axios");
const Report = require("../models/Report");
const Alert = require("../models/Alert");
const Prediction = require("../models/Prediction");
const weatherService = require("../services/weatherService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

exports.predictRisk = catchAsync(async (req, res, next) => {
  const { city } = req.body;

  if (!city) {
    return next(new AppError("City name is required for risk prediction", 400));
  }

  // 1) Fetch rainfall from Open-Meteo via weather service
  let rainfall = 0;
  try {
    const weatherData = await weatherService.getRainfallForCity(city);
    rainfall = weatherData.rainfall;
  } catch (err) {
    // Fallback: city-hash based value to ensure offline demo compatibility
    const cityHash = city.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    rainfall = 20 + (cityHash % 80);
    console.warn(`⚠️ Open-Meteo unavailable, using fallback rainfall for prediction: ${rainfall}mm`);
  }

  // 2) Count community reports in MongoDB (case-insensitive search)
  const reportsCount = await Report.countDocuments({
    city: { $regex: new RegExp("^" + city + "$", "i") },
  });

  // 3) Predict risk level
  let risk = "LOW";
  let predictionSource = "rule-based-fallback";

  try {
    const axiosClient = require("axios"); // import properly
    const aiResp = await axiosClient.post(
      "http://localhost:5001/predict",
      { rainfall, reports: reportsCount },
      { timeout: 2000 }
    );
    risk = aiResp.data.risk;
    predictionSource = "flask-ai-model";
    console.log(`🤖 AI model prediction for ${city}: ${risk}`);
  } catch (err) {
    console.warn("⚡ AI Flask model offline — fallback to local rule-based safety thresholds");
  }

  // Smart safety override limits
  if (rainfall >= 60 || reportsCount >= 4) {
    risk = "HIGH";
  } else if (rainfall >= 30 || reportsCount >= 2) {
    if (risk !== "HIGH") risk = "MODERATE";
  }

  // 4) Save Prediction record to MongoDB for historical tracking
  await Prediction.create({
    city,
    rainfall,
    reportsCount,
    risk,
  });

  // 5) Auto-generate high risk warnings
  if (risk === "HIGH") {
    // Prevent duplicated active warnings for the same city
    const existingAlert = await Alert.findOne({
      area: { $regex: new RegExp("^" + city + "$", "i") },
      level: "HIGH",
    });

    if (!existingAlert) {
      const alertReason = `HIGH risk detected: ${rainfall}mm rainfall + ${reportsCount} community reports`;
      const newAlert = await Alert.create({
        area: city,
        level: "HIGH",
        reason: alertReason,
      });

      const formattedAlert = {
        id: newAlert._id,
        area: newAlert.area,
        level: newAlert.level,
        reason: newAlert.reason,
        sent_at: newAlert.createdAt,
      };

      // Broadcast high risk event
      const io = req.app.get("socketio");
      if (io) {
        io.emit("new-alert", formattedAlert);
        console.log(`🚨 Broadcasted high-priority alert for: ${city}`);
      }
    }
  }

  res.status(200).json({
    city,
    rainfall,
    reports: reportsCount,
    risk,
    predictionSource,
  });
});
