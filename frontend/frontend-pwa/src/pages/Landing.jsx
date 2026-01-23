import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  const goToMap = () => {
    if (!location) return alert("Enter a location");
    navigate(`/map?location=${location}`);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "15%" }}>
      <h1>AI Disaster Alert System</h1>
      <p>Early warnings powered by AI & community reports</p>

      <input
        placeholder="Enter your city or area"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={{ padding: "10px", width: "250px" }}
      />

      <br />
      <br />

      <button onClick={goToMap} style={{ padding: "10px 20px" }}>
        View Disaster Map
      </button>
    </div>
  );
}
