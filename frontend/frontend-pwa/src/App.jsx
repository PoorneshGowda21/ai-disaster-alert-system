import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

import Landing from "./pages/Landing";
import MapPage from "./pages/MapPage";
import Admin from "./pages/Admin";
import "leaflet/dist/leaflet.css";

export default function App() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/reports")
      .then((res) => setReports(res.data))
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/admin" element={<Admin reports={reports} />} />
      </Routes>
    </BrowserRouter>
  );
}
