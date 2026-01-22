import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import MapView from "./components/MapView";
import Admin from "./pages/Admin";
import "leaflet/dist/leaflet.css";

const socket = io("http://localhost:5000");

export default function App() {
  const [reports, setReports] = useState([]);

  // Fetch reports initially
  useEffect(() => {
    axios
      .get("http://localhost:5000/reports")
      .then((res) => setReports(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Real-time updates
  useEffect(() => {
    socket.on("new-report", (data) => {
      setReports((prev) => [data, ...prev]);
    });

    return () => socket.off("new-report");
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView reports={reports} />} />
        <Route path="/admin" element={<Admin reports={reports} />} />
      </Routes>
    </BrowserRouter>
  );
}
