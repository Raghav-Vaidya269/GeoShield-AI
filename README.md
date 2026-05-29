# GeoShield AI

A landslide risk intelligence platform for Sindhupalchok, Nepal. GeoShield AI combines terrain, rainfall, and route data with a machine learning model to surface landslide hazard zones, plan safer travel paths, and capture live disaster alerts.

![GeoShield AI](https://img.shields.io/badge/GeoShield-AI-blue?style=flat)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![Flask](https://img.shields.io/badge/Flask-Backend-orange)
![Leaflet](https://img.shields.io/badge/Leaflet-Map-green)

## Features

- Interactive landslide heatmap based on trained Random Forest predictions
- Rainfall simulation slider to update vulnerability scores dynamically
- Safe route auditing using OSRM route geometry and geospatial risk scoring
- Real-time user-reported disaster alerts with map markers
- Dashboard statistics and municipality-level hazard summaries
- Responsive React + Leaflet frontend with dark/light styling

## Tech Stack

- Backend: Python, Flask, Flask-CORS
- Machine learning: scikit-learn, pandas, numpy, joblib
- Frontend: React, Vite, Tailwind CSS, Leaflet, React-Leaflet
- Networking: Axios, OSRM routing service
- Data storage: CSV feature matrix and JSON alert inventory

## Project Structure

- `backend/`
  - `app.py` — main Flask API server with endpoints for heatmap data, risk scoring, routing, and alerts
  - `requirements.txt` — Python dependencies for backend services
  - `data/`
    - `landslide_feature_matrix.csv` — feature dataset for model inference
    - `disasters.json` — persisted disaster alerts reported by users
  - `models/`
    - `rf_model.pkl` — serialized Random Forest model used for hazard predictions
  - data utilities for dataset preparation and synthetic data generation
- `frontend/`
  - `package.json` — frontend dependencies and scripts
  - `src/`
    - `App.jsx` — main application shell, state management, and page routing
    - `components/` — React components for home page, route planner, and disaster reporting
- `notebooks/`
  - `train_model.py` — script to train and serialize the landslide prediction model from the CSV dataset

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-org>/ecothon.git
   cd ecothon
   ```

2. Set up the Python backend:
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Verify required backend data and model files exist:
   - `backend/data/landslide_feature_matrix.csv`
   - `backend/models/rf_model.pkl`

   If the model is missing, train it with:
   ```bash
   python ..\notebooks\train_model.py
   ```

4. Install frontend dependencies:
   ```bash
   cd ..\frontend
   npm install
   ```

## Usage

### Start the backend server

```bash
cd backend
.venv\Scripts\activate
python app.py
```

The Flask API will run on `http://localhost:5000` by default.

### Start the frontend app

```bash
cd frontend
npm run dev
```

Open the local Vite URL displayed in the terminal (usually `http://localhost:5173`).

### How to use the app

- Browse the landing page and enter the interactive dashboard.
- Use the heatmap and rainfall slider to explore landslide hazard estimates.
- Open the route planner to compare safe travel options between hubs.
- Report a disaster by clicking a map location and submitting a hazard alert.

## API / Backend Details

### Endpoints

- `GET /api/heatmap`
  - Returns risk heatmap records from the landslide feature matrix.
- `GET /api/stats?rainfall_saturation=<value>`
  - Returns summary statistics, vulnerability percentage, and regional hazard table.
- `POST /api/risk-score`
  - Request body: `{ lat, lon, rainfall }`
  - Returns a risk score, label, and matched feature parameters.
- `POST /api/travel-route`
  - Request body: `{ start_node, end_node, rainfall_saturation }`
  - Fetches OSRM route geometry and evaluates risk along the path.
- `GET /api/disasters`
  - Returns active disaster alerts from `backend/data/disasters.json`.
- `POST /api/disasters`
  - Request body: `{ lat, lon, description }`
  - Saves a new disaster alert to JSON storage.

### Architecture

- The backend loads a CSV feature matrix and a serialized Random Forest model.
- Risk scoring uses both the model output and a dynamic geo-risk factor based on rainfall and slope.
- Route auditing queries OSRM for driving geometry, down-samples waypoints, and evaluates risk for each segment.
- The frontend consumes the backend API and renders interactive maps, charts, and alert controls.

## Future Improvements

- Add authentication and role-based access for alert reporting
- Deploy the frontend and backend to a cloud hosting platform
- Replace public OSRM routing with a self-hosted engine for offline use
- Add mobile-first responsive controls and accessibility improvements
- Enhance model training with more geospatial and environmental features

## Contributing

- Open an issue for bugs, enhancements, or questions
- Create a feature branch for your work
- Submit pull requests with clear descriptions and related changes
- Keep new additions documented and test local setup before merging

## License

No license file is included in this repository. Add a `LICENSE` file to specify the terms of use and contribution policy.

> Notes: The frontend expects the backend at `http://localhost:5000`. Route planning depends on the public OSRM service and may require an active internet connection.