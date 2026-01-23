import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import MapView from "../components/MapView";

const socket = io("http://localhost:5000");

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const query = new URLSearchParams(useLocation().search);
  const locationName = query.get("location");

  const loadReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/reports");
      setReports(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadReports();

    socket.on("new-report", (data) => {
      setReports((prev) => [data, ...prev]);
    });

    return () => socket.off("new-report");
  }, []);

  return (
    <div style={{ padding: "10px" }}>
      {/* Title */}
      <h3 style={{ textAlign: "center" }}>
        Showing reports near: {locationName}
      </h3>

      {/* 🔥 Day 12 — Risk Summary Panel */}
      <div
        style={{ background: "#f5f5f5", padding: "10px", marginBottom: "10px" }}
      >
        <h4>Current Risk Level</h4>
        <p>
          Status: <b>Moderate</b>
        </p>
        <p>Reason: Recent rainfall + community reports</p>
      </div>

      {/* Search */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <input
          placeholder="Search another area"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              window.location.href = `/map?location=${e.target.value}`;
            }
          }}
          style={{ padding: "8px", width: "250px" }}
        />
      </div>

      {/* Navigation */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <button onClick={() => (window.location.href = "/")}>
          Back to Home
        </button>{" "}
        <button onClick={() => (window.location.href = "/admin")}>
          Admin Dashboard
        </button>
      </div>

      {/* Map */}
      <MapView reports={reports} />

      {/* 🔥 Day 12 — Explainability Section */}
      <p
        style={{ fontStyle: "italic", textAlign: "center", marginTop: "10px" }}
      >
        Alerts are generated using AI predictions combined with live community
        reports.
      </p>
    </div>
  );
}
