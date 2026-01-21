import { useEffect, useState } from "react";
import axios from "axios";
import MapView from "./components/MapView";
import ReportForm from "./components/ReportForm";

export default function App() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/reports")
      .then((res) => {
        setReports(res.data);
      })
      .catch((err) => {
        console.error("Error fetching reports:", err);
      });
  }, []);

  return (
    <div className="h-screen w-screen">
      <MapView reports={reports} />
    </div>
  );
}

const reloadReports = () => {
  axios
    .get("http://localhost:5000/reports")
    .then((res) => setReports(res.data));
};

<ReportForm onSubmit={reloadReports} />;
