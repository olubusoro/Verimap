# VeriMap — Lagos Disaster Reporting & Verification System

> A full-stack, AI-powered disaster reporting platform for Lagos, Nigeria.
> Citizens submit geo-tagged photo reports. A three-signal AI pipeline
> auto-verifies them. Dispatchers monitor live incidents on an interactive map.

---

## Architecture

```
verimap/
├── ai-service/      # Python FastAPI — MobileNetV2 inference
├── server/          # Node.js + Express — REST API + WebSocket
├── client/          # React + Leaflet — Citizen form + Dispatcher map
└── docker-compose.yml
```

### Confidence Score Formula

| Signal | Weight | Source |
|---|---|---|
| CNN score | 50% | MobileNetV2 (FastAPI) |
| Precipitation | 30% | OpenWeatherMap API |
| Flood zone flag | 20% | MongoDB geospatial query |

**Threshold**: composite ≥ **0.80** → `VERIFIED` + WebSocket broadcast

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB running on `localhost:27017`
- (Optional) OpenWeatherMap free API key

### 1 — AI Microservice

```bash
cd ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/health
```

### 2 — Backend

```bash
cd server
cp .env.example .env          # fill in your API keys
npm install
npm run dev
# → http://localhost:5000/api/health
```

### 3 — Frontend

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

---

## Quick Start (Docker Compose)

```bash
# Copy and fill in your OpenWeatherMap key
cp server/.env.example .env
echo "OPENWEATHER_API_KEY=your_key_here" >> .env

docker-compose up --build
```

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| Express API | http://localhost:5000 |
| FastAPI AI service | http://localhost:8000 |
| MongoDB | mongodb://localhost:27017 |

---

## API Reference

### `POST /api/reports`
Submit a disaster report.

**Body** (multipart/form-data):
| Field | Type | Required |
|---|---|---|
| `description` | string | ✅ |
| `lat` | number | ✅ |
| `lng` | number | ✅ |
| `photo` | image file | ❌ |

**Response**:
```json
{
  "success": true,
  "message": "Report received.",
  "report": {
    "id": "...",
    "status": "VERIFIED",
    "confidenceScore": 0.84,
    "cnnScore": 0.72,
    "precipScore": 0.40,
    "inFloodZone": true
  }
}
```

### `GET /api/reports`
Returns all reports (newest first, max 500).

### WebSocket `ws://localhost:5000`
Events emitted by the server:
| Event | Trigger |
|---|---|
| `new_report` | Any new report submitted |
| `new_verified_report` | Report crosses the 0.80 threshold |

---

## File-by-File Explanation

### `ai-service/main.py`
FastAPI app. Loads MobileNetV2 once at startup. The `/analyze` endpoint
accepts an image, runs inference, decodes the top-10 ImageNet predictions,
and boosts the score when labels match disaster-related keywords (flood, fire,
wreck, rubble, etc.). Adds an uncertainty boost when the model is unsure —
unusual scenes that the model can't confidently classify often indicate
disaster imagery.

### `server/index.js`
Entry point. Creates an HTTP server from the Express app and attaches a `ws`
WebSocketServer to it so both protocols share port 5000. Connects to MongoDB
and runs the flood-zone seed before starting the listener.

### `server/app.js`
Express configuration: CORS for the Vite dev server, JSON parsing, static
file serving for `/uploads`, and route mounting.

### `server/routes/reports.js`
The scoring pipeline:
1. Multer saves the uploaded photo to `server/uploads/`
2. Report saved to MongoDB with `status: PENDING`
3. Three async calls fired in parallel via `Promise.allSettled`:
   - AI service → CNN score
   - OpenWeatherMap → precipitation score
   - MongoDB `$geoIntersects` → flood zone flag
4. Composite score = `0.5×CNN + 0.3×precip + 0.2×zone`
5. Score ≥ 0.80 → mark `VERIFIED`, broadcast via WebSocket
6. `allSettled` means a failed sub-call (e.g. AI service is down) defaults
   to 0 and doesn't crash the whole pipeline.

### `server/models/Report.js`
Mongoose schema with a GeoJSON Point `location` field and a `2dsphere`
index enabling all MongoDB geospatial operators.

### `server/services/geoService.js`
Defines the `Zone` Mongoose model (GeoJSON Polygon + 2dsphere index) and
the `isInFloodZone(lat, lng)` function that runs `$geoIntersects` against
the seeded Lagos flood zone polygons.

### `server/seed/floodZones.js`
Seeds five approximate GeoJSON Polygon boundaries for historically
flood-prone Lagos areas (Lagos Island, Surulere, Badagry Creek, Lekki
Peninsula, Ikorodu). Idempotent — skips if zones already exist.

### `server/services/wsService.js`
Module-level singleton storing the `ws.WebSocketServer` instance.
`broadcast(event, data)` serialises and sends a typed JSON message to every
open dispatcher connection.

### `client/src/pages/ReportForm.jsx`
Citizen page. Calls `navigator.geolocation.getCurrentPosition` on mount.
Photo drop zone creates an object URL for instant preview. On submit, builds
a `FormData` payload and POSTs to `/api/reports`. Shows confidence breakdown
on success.

### `client/src/pages/Dashboard.jsx`
Dispatcher page. Fetches all reports on mount. WebSocket hook injects new
pins in real time. Uses react-leaflet `CircleMarker` (red = VERIFIED, yellow
= PENDING) with a custom `Popup`. Sidebar list items fly the map to their
marker. CartoDB Dark Matter tiles match the dark UI theme.

### `client/src/hooks/useWebSocket.js`
Custom React hook. Opens a WebSocket to the backend. Auto-reconnects with a
3-second delay on disconnect. Parses typed `{ event, data }` JSON messages
and dispatches them to a caller-supplied callback via a stable ref.

---

## Environment Variables

### `server/.env`
| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/verimap` | MongoDB connection string |
| `OPENWEATHER_API_KEY` | — | Free key from openweathermap.org |
| `AI_SERVICE_URL` | `http://localhost:8000` | FastAPI microservice URL |
| `PORT` | `5000` | Express server port |

---

## Lagos Flood Zones (Seeded)

| Zone | Coverage |
|---|---|
| Lagos Island / Eko Atlantic | Low-lying coastal island |
| Surulere / Orile Agege | Flood-prone basin, mainland |
| Badagry Creek / Festac | Creek-adjacent, western Lagos |
| Lekki Peninsula / Ajah | Barrier island, subsidence risk |
| Ikorodu / Sagamu Expressway | Northern flood plain |
