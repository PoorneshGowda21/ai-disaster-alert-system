const axios = require("axios");

// Shared service to geocode a city and retrieve precipitation statistics
exports.getRainfallForCity = async (city) => {
  // 1) Geocode city
  const geoRes = await axios.get(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
    { 
      headers: { "User-Agent": "DisasterWatchAI/1.0" }, 
      timeout: 5000 
    }
  );

  if (!geoRes.data || geoRes.data.length === 0) {
    throw new Error("City not found");
  }

  const { lat, lon, display_name } = geoRes.data[0];

  // 2) Query weather
  const weatherRes = await axios.get(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,rain,weathercode&daily=precipitation_sum&timezone=auto&forecast_days=1`,
    { 
      timeout: 5000 
    }
  );

  const current = weatherRes.data.current;
  const rainfall = (current.precipitation || 0) + (current.rain || 0);
  const dailySum = weatherRes.data.daily?.precipitation_sum?.[0] || 0;
  
  const effectiveRainfall = rainfall > 0 ? rainfall : dailySum;

  return {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    display_name,
    rainfall: parseFloat(effectiveRainfall.toFixed(2)),
  };
};
