import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Fix default marker icons
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ✅ This component recenter the map whenever `center` changes
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, 12, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

const typeColors = {
  Flood: "#3b82f6",
  Fire: "#ef4444",
  Landslide: "#f59e0b",
  Earthquake: "#8b5cf6",
  Storm: "#06b6d4",
  Other: "#6b7280",
};

function getColoredIcon(type) {
  const color = typeColors[type] || typeColors.Other;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px; height:28px;
      background:${color};
      border:2px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function getHelpRequestIcon(type) {
  const color = type === "request" ? "#6366f1" : "#10b981"; // Indigo for request, Emerald for offer
  return L.divIcon({
    className: "",
    html: `<div style="
      width:24px; height:24px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    ">${type === "request" ? "🤝" : "🎁"}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function getSearchCenterIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px; height:32px;
      background:#4f8ef7;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(79, 142, 247, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">📍</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export default function MapView({ reports, helpRequests = [], onResolveHelp, center, cityName }) {
  return (
    <MapContainer
      center={center || [12.9716, 77.5946]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
    >
      {/* ✅ Recenters map on city change */}
      <RecenterMap center={center} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Searched Location Center Pin */}
      {center && center.length === 2 && (
        <Marker
          position={center}
          icon={getSearchCenterIcon()}
        >
          <Popup>
            <div style={{ textAlign: "center", minWidth: "120px" }}>
              <strong style={{ fontSize: "14px", color: "var(--accent-blue)" }}>📍 {cityName || "Search Center"}</strong>
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Active search target
              </span>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Disaster Incident Reports */}
      {reports
        .filter((r) => r.latitude && r.longitude)
        .map((r) => (
          <Marker
            key={r.id || r._id}
            position={[parseFloat(r.latitude), parseFloat(r.longitude)]}
            icon={getColoredIcon(r.type)}
          >
            <Popup>
              <div style={{ minWidth: "160px" }}>
                <strong style={{ fontSize: "15px" }}>
                  {r.type === "Flood" ? "🌊" : r.type === "Fire" ? "🔥" : r.type === "Landslide" ? "⛰️" : r.type === "Earthquake" ? "🌍" : r.type === "Storm" ? "🌪️" : "⚠️"}
                  {" "}{r.type}
                </strong>
                <br />
                <span style={{ color: "#8892b0", fontSize: "12px" }}>Severity: </span>
                <span style={{ fontWeight: 600 }}>{r.severity}</span>
                {r.city && (
                  <>
                    <br />
                    <span style={{ color: "#8892b0", fontSize: "12px" }}>City: </span>
                    <span>{r.city}</span>
                  </>
                )}
                {r.description && (
                  <>
                    <br />
                    <span style={{ color: "#8892b0", fontSize: "12px", display: "block", marginTop: "4px" }}>
                      {r.description}
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Community Help Requests / Offers */}
      {helpRequests
        .filter((h) => h.latitude && h.longitude && h.status !== "resolved")
        .map((h) => (
          <Marker
            key={h.id || h._id}
            position={[parseFloat(h.latitude), parseFloat(h.longitude)]}
            icon={getHelpRequestIcon(h.type)}
          >
            <Popup>
              <div style={{ minWidth: "180px", color: "var(--text-primary)" }}>
                <strong style={{ fontSize: "14px", color: h.type === "request" ? "#6366f1" : "#10b981", display: "block" }}>
                  {h.type === "request" ? "🤝 Aid Request" : "🎁 Aid Offer"}
                </strong>
                <strong style={{ fontSize: "13px", display: "block", marginTop: "4px" }}>
                  {h.title}
                </strong>
                <span style={{ color: "#8892b0", fontSize: "11px" }}>Category: </span>
                <span style={{ fontWeight: 600, fontSize: "11px", textTransform: "capitalize" }}>{h.category}</span>
                <p style={{ fontSize: "12px", margin: "6px 0", color: "#e8eaf6" }}>
                  {h.description}
                </p>
                <div style={{ fontSize: "11px", color: "#8892b0", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "6px", marginTop: "6px" }}>
                  <strong>Contact:</strong> {h.contactName} ({h.contactPhone})
                </div>
                <button
                  onClick={() => onResolveHelp(h.id || h._id)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "10px",
                    padding: "6px",
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "4px",
                    color: "#10b981",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  ✓ Mark as Resolved
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
