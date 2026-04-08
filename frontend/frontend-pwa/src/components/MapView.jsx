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

export default function MapView({ reports, center }) {
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

      {reports
        .filter((r) => r.latitude && r.longitude)
        .map((r) => (
          <Marker
            key={r.id}
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
    </MapContainer>
  );
}
