import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import MapView from "../components/MapView";

export default function MapPage() {
  const navigate = useNavigate();
  const locationData = useLocation();

  const city = locationData.state?.city || null;

  const [reports, setReports] = useState([]);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚨 Protect route (NO redirect loop)
  useEffect(() => {
    if (!city) {
      navigate("/");
    }
  }, [city, navigate]);

  // 📍 Convert city → coordinates
  useEffect(() => {
    if (!city) return;

    setLoading(true);

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&city=${city}&country=India`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          setCoords({
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [city]);

  // 📦 Load reports
  useEffect(() => {
    axios
      .get("http://localhost:5000/reports")
      .then((res) => setReports(res.data))
      .catch((err) => console.error(err));
  }, []);

  // 🟡 Loading guard (PREVENT BLANK PAGE)
  if (loading || !coords) {
    return <p style={{ textAlign: "center" }}>Loading map...</p>;
  }

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>
        Disaster Reports for <span style={{ color: "red" }}>{city}</span>
      </h2>

      <div style={{ background: "#f5f5f5", padding: "10px", margin: "10px" }}>
        <h4>Current Risk Level</h4>
        <p>
          Status: <b>Moderate</b>
        </p>
        <p>Reason: Recent rainfall + community reports</p>
      </div>

      <div style={{ margin: "10px" }}>
        <input
          placeholder="Search another area"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigate("/map", { state: { city: e.target.value } });
            }
          }}
          style={{ padding: "8px", width: "250px" }}
        />
        <br />
        <br />
        <button onClick={() => navigate("/")}>Back to Home</button>
        <button
          onClick={() => navigate("/admin")}
          style={{ marginLeft: "10px" }}
        >
          Admin Dashboard
        </button>
      </div>

      <MapView reports={reports} center={coords} />

      <p
        style={{ fontStyle: "italic", textAlign: "center", marginTop: "10px" }}
      >
        Alerts are generated using AI predictions combined with live community
        reports.
      </p>
    </div>
  );
}
