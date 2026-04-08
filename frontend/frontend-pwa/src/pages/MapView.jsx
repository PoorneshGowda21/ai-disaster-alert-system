import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
});

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 11);
  }, [center, map]);

  return null;
}

export default function MapView({ reports, center }) {
  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: "90vh", width: "100%" }}
    >
      <RecenterMap center={center} />

      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

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
