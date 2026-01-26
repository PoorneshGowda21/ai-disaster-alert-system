import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "../components/MapView";

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [risk, setRisk] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const city = location.state?.city;

  // 🚨 Protect route
  if (!city) {
    navigate("/");
    return null;
  }

  // Load reports
  const loadReports = async () => {
    const res = await axios.get("http://localhost:5000/reports");
    setReports(res.data);
  };

  // Load AI risk
  const loadRisk = async () => {
    const res = await axios.post("http://localhost:5000/predict-risk", {
      rainfall: 80,
      area: city,
    });
    setRisk(res.data.risk);
  };

  useEffect(() => {
    loadReports();
    loadRisk();
  }, []);

  return (
    <>
      <h2 style={{ textAlign: "center" }}>
        Disaster Reports for <span style={{ color: "red" }}>{city}</span>
      </h2>

      {/* 🔥 AI RISK BANNER */}
      {risk && (
        <div
          style={{
            padding: "12px",
            margin: "10px",
            textAlign: "center",
            background:
              risk === "HIGH"
                ? "#d32f2f"
                : risk === "MODERATE"
                  ? "#f57c00"
                  : "#388e3c",
            color: "white",
            fontWeight: "bold",
          }}
        >
          AI Predicted Risk Level: {risk}
        </div>
      )}

      {/* NAV BUTTONS */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <button onClick={() => navigate("/")}>Back to Home</button>{" "}
        <button onClick={() => navigate("/admin")}>Admin Dashboard</button>
      </div>

      {/* MAP */}
      <MapView reports={reports} />

      <p style={{ textAlign: "center", fontStyle: "italic" }}>
        Risk is predicted using AI based on rainfall and live community reports.
      </p>
    </>
  );
}
