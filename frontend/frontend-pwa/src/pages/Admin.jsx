import { useEffect, useState } from "react";
import axios from "axios";

export default function Admin({ reports }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/alerts")
      .then((res) => setAlerts(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "20px", minHeight: "100vh", background: "#f4f4f4" }}>
      <h1>Admin Dashboard</h1>

      <h3>Total Reports: {reports?.length || 0}</h3>

      <hr />

      <h2>🚨 AI Alerts</h2>

      {alerts.length === 0 && <p>No alerts yet</p>}

      {alerts.map((a) => (
        <div
          key={a.id}
          style={{
            background: "white",
            padding: "10px",
            marginBottom: "10px",
            borderLeft: "5px solid red",
          }}
        >
          <b>Area:</b> {a.area} <br />
          <b>Level:</b> {a.level} <br />
          <b>Reason:</b> {a.reason}
        </div>
      ))}
    </div>
  );
}
