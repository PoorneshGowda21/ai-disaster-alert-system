# 🛡️ DisasterWatch AI: MERN-Powered GIS Disaster & Community Aid Hub

DisasterWatch AI is a full-featured, production-ready disaster alert and resilience platform. Designed as a robust portfolio piece, it showcases end-to-end MERN development, geospatial mapping (GIS), client-side document compilation, real-time message broadcasting, and serverless deployment models.

---

## 🚀 Key Highlights & Engineering Features

### 1. Geospatial GIS Interface & Pin Targets
- **Interactive Mapping**: Uses **Leaflet** and OpenStreetMap tiles to display community reports.
- **Search Geocoding**: Automatically translates a search location (separated by locality and parent district) into precise latitude/longitude coordinates via Nominatim APIs.
- **Target Overlay**: Renders an animated pulse aura pin (`📍`) showing the center of the searched locality.

### 2. MERN-Backed Community Aid Board
- **Mutual Aid Infrastructure**: Features an exchange board where users can request or offer support resources (e.g. food, water, medical supplies, shelter, utilities).
- **Socket-Powered Pins**: Renders custom marker avatars on the map (🤝/🎁) in real-time. Members of the community can resolve active aid pins directly on the map popup, which updates all connected clients instantly.

### 3. Dynamic PDF Risk Exporter
- **Client-Side Compilation**: Generates clean, professional PDF Risk Assessment Reports locally using **jsPDF**.
- **Contextual PDFs**: Gathers real-time rainfall counts, coordinates, community reports, and active hazard descriptions, compiling them along with emergency checklist guides corresponding to the risk level.

### 4. Safety Checklist database Sync
- **Interactive Emergency Planner**: Users can follow custom checklists corresponding to different disaster categories.
- **MERN Synchronization**: Integrates user authorization (JWT), saving checklist states to MongoDB Atlas so checklists sync across devices (with client-side local storage fallback for guests).

### 5. Production Resilience & Fallbacks
- **Offline ML Mode**: If the Python Flask machine learning service is offline, the backend automatically falls back to an aligned rule-based classification algorithm.
- **In-Memory Cache Fallback**: If the remote MongoDB Atlas instance is unreachable, the Express backend automatically activates an in-memory cached storage system so that endpoints never crash.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Leaflet.js, React-Leaflet, jsPDF, Vanilla CSS (Premium Glassmorphic Dark UI) |
| **Backend** | Node.js, Express.js (Modular Serverless Wrapper), Socket.io, Mongoose (MongoDB) |
| **Integrations** | Nominatim Geocoding API, Open-Meteo Precipitation Forecast API |
| **Deployment** | Vercel (Serverless Functions + Static Build hosting) |

---

## 🏃 Local Development

Thanks to the workspace `concurrently` configurations, you can launch the backend database node and the Vite frontend server in parallel under a single command.

### 1. Install Dependencies
Run in the root directory:
```bash
npm install
npm --prefix backend install
npm --prefix frontend/frontend-pwa install
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_jwt_key
```

### 3. Start Development Servers
Run the dev script in the root directory:
```bash
npm run dev
```
- **Frontend** runs at: `http://localhost:5173`
- **Backend API** runs at: `http://localhost:5000`

---

## ☁️ Serverless Vercel Deployment

This project is pre-configured for zero-config deployment on **Vercel** via a root-level `vercel.json` file.

### Deployment Configuration settings:
- **Framework Preset**: Vite / Other
- **Root Directory**: `.` (Repository root)
- **Build Command**: `npm --prefix frontend/frontend-pwa install && npm --prefix frontend/frontend-pwa run build`
- **Output Directory**: `frontend/frontend-pwa/dist`
- **Vercel Environment Variables**:
  - Add `MONGO_URI` (your MongoDB Atlas connection string)
  - Add `JWT_SECRET` (your JWT signature secret)
