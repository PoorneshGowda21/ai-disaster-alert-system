import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import Landing  from "./pages/Landing";
import MapPage  from "./pages/MapPage";
import Admin    from "./pages/Admin";
import Login    from "./pages/Login";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"      element={<Landing />} />
          <Route path="/map"   element={<MapPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
