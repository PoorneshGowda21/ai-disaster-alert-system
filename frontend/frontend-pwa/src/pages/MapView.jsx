import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
});

/* 🔥 This component FORCE-UPDATES map center */
function RecenterMap({ lat, lon }) {
  const map = useMap();

  useEffect(() => {
    if (lat && lon) {
      map.setView([lat, lon], 12);
    }
  }, [lat, lon, map]);

  return null;
}

export default function MapView({ reports, center }) {
  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={12}
      style={{ height: "90vh", width: "100%" }}
    >
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* ✅ THIS IS WHAT FIXES YOUR ISSUE */}
      <RecenterMap lat={center.lat} lon={center.lon} />

      {reports.length === 0 && (
        <p style={{ textAlign: "center" }}>No reports yet</p>
      )}

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
  );
}
