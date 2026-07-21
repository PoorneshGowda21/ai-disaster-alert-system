const catchAsync = require("../utils/catchAsync");
const weatherService = require("../services/weatherService");
const AppError = require("../utils/AppError");

// Fetch weather information using the weather service
exports.getWeather = catchAsync(async (req, res, next) => {
  const { city } = req.params;

  if (!city) {
    return next(new AppError("City name is required", 400));
  }

  try {
    const weatherData = await weatherService.getRainfallForCity(city);
    res.status(200).json({
      city,
      display_name: weatherData.display_name,
      lat: weatherData.lat,
      lon: weatherData.lon,
      rainfall: weatherData.rainfall,
      unit: "mm",
    });
  } catch (error) {
    return next(new AppError(error.message || "Failed to fetch weather indicators", 404));
  }
});
