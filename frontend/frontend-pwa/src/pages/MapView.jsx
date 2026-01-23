import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icon (important for Leaflet + React)
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MapView({ reports }) {
  return (
    <div style={{ height: "70vh", width: "100%" }}>
      <MapContainer
        center={[12.9716, 77.5946]} // Bangalore default
        zoom={11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ✅ Day 13 — Empty State */}
        {reports.length === 0 && (
          <p style={{ textAlign: "center" }}>No reports yet</p>
        )}

        {/* Markers */}
        {reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <strong>{r.type}</strong>
              <br />
              Severity: {r.severity}
              <br />
              {r.description}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
