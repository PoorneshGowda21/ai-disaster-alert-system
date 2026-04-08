# ai-disaster-alert-system
AI-powered local disaster early warning &amp; community alert system.


# DisasterWatch AI — Community Disaster Alert System

An AI-powered, community-driven disaster early warning platform. Citizens report incidents on the ground in real time, and the system combines that crowdsourced data with live weather information to predict flood, fire, and storm risk for any city — before official warnings are issued.

---

## What This Project Does

Most disaster alert systems push information from the top down — government to citizen. This flips that model. Anyone can open the app, search their city, see the current AI-predicted risk level based on real rainfall data, and submit an incident report directly from the map. The moment reports start coming in from an area, the risk score adjusts and alerts are generated automatically.

Think of it as Waze, but for natural disasters.

---

## Features

- **Live weather integration** — Pulls real-time rainfall data from Open-Meteo (free, no API key required) for whichever city is searched. No hardcoded values.
- **AI risk prediction** — A Decision Tree model trained on rainfall and incident report density outputs LOW / MODERATE / HIGH risk. High risk triggers an automatic alert stored in the system.
- **Real-time updates via Socket.io** — New reports appear on the map and in the admin dashboard without any page refresh.
- **Community incident reporting** — Logged-in users can report Flood, Fire, Landslide, Earthquake, Storm, or Other events with severity levels and GPS coordinates.
- **JWT authentication** — Register and login system with bcrypt password hashing and JSON Web Token sessions.
- **Interactive Leaflet map** — Geocodes any city name and drops colour-coded markers for each incident type.
- **Admin dashboard** — Monitors all incoming reports, AI-generated alerts, high/critical counts, and unique cities covered.
- **PWA support** — Installable on Android and desktop via vite-plugin-pwa. Works offline after first load.
- **Python ML microservice** — Separate Flask service runs the trained model. If it's offline, the backend falls back to rule-based logic so the app never breaks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v7 |
| Map | Leaflet.js + React-Leaflet, OpenStreetMap / Nominatim |
| Real-time | Socket.io (client + server) |
| Backend | Node.js, Express.js |
| Authentication | JWT, bcryptjs |
| Database | MongoDB via Mongoose |
| Weather API | Open-Meteo (free, no key needed) |
| ML Model | Python, scikit-learn (Decision Tree), Flask, joblib |
| PWA | vite-plugin-pwa |
| DevOps | Docker, docker-compose |

---

## Project Structure

```
ai-disaster-alert-system/
├── backend/
│   ├── index.js          # Express server, all API routes, Socket.io, JWT auth
│   ├── db.js             # MongoDB connection
│   └── package.json
├── frontend/
│   └── frontend-pwa/
│       ├── src/
│       │   ├── context/AuthContext.jsx   # JWT auth state
│       │   ├── pages/
│       │   │   ├── Landing.jsx           # Home page with city search
│       │   │   ├── MapPage.jsx           # Live map + report form + risk panel
│       │   │   ├── Admin.jsx             # Admin dashboard
│       │   │   └── Login.jsx             # Register / Sign in
│       │   └── components/
│       │       └── MapView.jsx           # Leaflet map component
│       └── vite.config.js                # Vite + PWA config
├── model-service/
│   ├── app.py            # Flask prediction endpoint
│   ├── train.py          # Model training script
│   ├── model.pkl         # Trained Decision Tree model
│   └── data/
│       ├── train.csv     # Training data
│       └── rainfall.csv  # Historical rainfall dataset
└── docker-compose.yml
```

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Get JWT token |
| GET | `/reports` | No | All incident reports |
| POST | `/report` | Yes | Submit new report |
| GET | `/alerts` | No | AI-generated alerts |
| POST | `/predict-risk` | No | Run AI risk prediction |
| GET | `/weather/:city` | No | Live rainfall via Open-Meteo |

---

## How to Run Locally (Step by Step)

### Prerequisites — install these first

| Tool | Version | Download |
|---|---|---|
| Node.js | v18 or above | https://nodejs.org |
| Python | v3.9 or above | https://python.org |
| Git | Any | https://git-scm.com |
| MongoDB Atlas account | Free | https://mongodb.com/atlas |

> MongoDB Atlas free tier (M0) is completely free — no credit card needed. Just sign up, create a free cluster, and copy your connection string.

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/PoorneshGowda21/ai-disaster-alert-system.git
cd ai-disaster-alert-system
```

---

### Step 2 — Set up the Backend

```bash
cd backend
npm install
```

Create a file named `.env` inside the `backend/` folder:

```
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/disasterdb?retryWrites=true&w=majority
JWT_SECRET=your_secret_key_here
PORT=5000
```

Replace `YOUR_USERNAME`, `YOUR_PASSWORD`, and the cluster URL with your actual MongoDB Atlas connection string.

Start the backend:

```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:5000
✅ MongoDB connected
```

---

### Step 3 — Set up the Python Model Service

Open a new terminal:

```bash
cd model-service
pip install -r requirements.txt
python app.py
```

You should see Flask running on `http://localhost:5001`

> This step is optional. If the model service is not running, the backend automatically falls back to a rule-based risk engine and everything still works.

---

### Step 4 — Set up the Frontend

Open another new terminal:

```bash
cd frontend/frontend-pwa
npm install
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

---

### Step 5 — Open the App

Go to **http://localhost:5173** in your browser.

- Type any Indian city (e.g. Bangalore, Mysuru, Chennai) and click View Map
- Register an account to submit incident reports
- Visit `/admin` to see the dashboard

---

### Summary — Three terminals running at once

| Terminal | Folder | Command | URL |
|---|---|---|---|
| 1 | `backend/` | `npm run dev` | http://localhost:5000 |
| 2 | `model-service/` | `python app.py` | http://localhost:5001 |
| 3 | `frontend/frontend-pwa/` | `npm run dev` | **http://localhost:5173** |

---

## Common Issues

**MongoDB connection error**
Double-check your `.env` file. Make sure Network Access in Atlas is set to allow connections from anywhere (0.0.0.0/0).

**Port already in use**
```bash
npx kill-port 5000
npx kill-port 5173
```

**pip not found**
Try `pip3` instead of `pip`, or install Python from https://python.org and make sure it's added to PATH.

**npm not found**
Install Node.js LTS from https://nodejs.org and restart your terminal.

---

## Real-World Application

This system is built around the same principle used by disaster management authorities like NDMA and state-level SDMA bodies — combining environmental sensor data (rainfall) with ground-level reports to generate early risk warnings. The difference is that this version is entirely community-powered and runs on free open-source infrastructure.

Similar real-world systems include IFLOWS (Mumbai flood monitoring), Flood Watch apps used by local councils, and the crowdsourced crisis-mapping platform Ushahidi used during the Haiti earthquake response.

---

## Author

**Poornesh Gowda**
GitHub: [@PoorneshGowda21](https://github.com/PoorneshGowda21)

---

*Built with open-source tools. Map data from OpenStreetMap contributors. Weather data from Open-Meteo.*
