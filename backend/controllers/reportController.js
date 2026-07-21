const Report = require("../models/Report");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Fetch all reports (sorted newest first)
exports.getReports = catchAsync(async (req, res, next) => {
  const reports = await Report.find().sort({ createdAt: -1 });

  // Map database format to frontend-expected schema (using legacy .id interface)
  const formattedReports = reports.map((r) => ({
    id: r._id,
    type: r.type,
    severity: r.severity,
    description: r.description,
    latitude: r.location.coordinates[1], // Extract lat from GeoJSON Point [lng, lat]
    longitude: r.location.coordinates[0], // Extract lng from GeoJSON Point [lng, lat]
    city: r.city,
    submittedBy: r.submittedBy,
    created_at: r.createdAt,
  }));

  res.status(200).json(formattedReports);
});

// Create new report
exports.createReport = catchAsync(async (req, res, next) => {
  const { type, severity, description, latitude, longitude, city } = req.body;

  if (!city) return next(new AppError("City is required", 400));
  if (!type) return next(new AppError("Type is required", 400));
  if (!severity) return next(new AppError("Severity level is required", 400));

  const latNum = parseFloat(latitude) || 0;
  const lngNum = parseFloat(longitude) || 0;

  // Insert into MongoDB
  const report = await Report.create({
    type,
    severity,
    description,
    city,
    location: {
      type: "Point",
      coordinates: [lngNum, latNum], // GeoJSON order: [longitude, latitude]
    },
    // Optional: read user name from req.user if auth token is present (otherwise Anonymous)
    submittedBy: req.user ? req.user.name : "Anonymous",
  });

  const formattedReport = {
    id: report._id,
    type: report.type,
    severity: report.severity,
    description: report.description,
    latitude: latNum,
    longitude: lngNum,
    city: report.city,
    submittedBy: report.submittedBy,
    created_at: report.createdAt,
  };

  // Broadcast the new report to all connected socket.io clients
  const io = req.app.get("socketio");
  if (io) {
    io.emit("new-report", formattedReport);
    console.log(`📡 Broadcasted new report: ${type} in ${city} via WebSockets`);
  }

  res.status(201).json(formattedReport);
});

// Geospatial proximity search (radius in kilometers)
exports.getNearbyReports = catchAsync(async (req, res, next) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return next(new AppError("Please provide lat and lng query parameters", 400));
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusInMeters = (parseFloat(radius) || 10) * 1000; // default to 10km radius

  // Run Mongoose $near geospatial query on 2dsphere location index
  const reports = await Report.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lngNum, latNum],
        },
        $maxDistance: radiusInMeters,
      },
    },
  });

  const formattedReports = reports.map((r) => ({
    id: r._id,
    type: r.type,
    severity: r.severity,
    description: r.description,
    latitude: r.location.coordinates[1],
    longitude: r.location.coordinates[0],
    city: r.city,
    submittedBy: r.submittedBy,
    created_at: r.createdAt,
  }));

  res.status(200).json(formattedReports);
});
