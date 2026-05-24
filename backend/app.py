from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import joblib
import numpy as np
import os
import requests
import json
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

# 1. Physical Sourcing Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DISASTERS_PATH = os.path.join(BASE_DIR, 'data', 'disasters.json')

def load_disasters():
    if not os.path.exists(DISASTERS_PATH):
        os.makedirs(os.path.dirname(DISASTERS_PATH), exist_ok=True)
        with open(DISASTERS_PATH, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(DISASTERS_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return []

def save_disasters(disasters):
    try:
        os.makedirs(os.path.dirname(DISASTERS_PATH), exist_ok=True)
        with open(DISASTERS_PATH, 'w') as f:
            json.dump(disasters, f, indent=4)
        return True
    except Exception as e:
        print(f"[ERROR] Failed to save disasters: {str(e)}")
        return False

DATA_PATH = os.path.join(BASE_DIR, 'data', 'landslide_feature_matrix.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'rf_model.pkl')

FEATURE_COLS = [
    'dem_epsg4326', 'slope_epsg4326', 'aspect_epsg4326',
    'twi_epsg4326', 'ndvi_epsg4326', 'landcover_epsg4326', 'rainfall_epsg4326'
]

# Explicit Infrastructure Hub Profiles (Task 1.1)
HUB_CATALOG = {
    "Melamchi": {"lat": 27.8300, "lon": 85.5800},
    "Chautara": {"lat": 27.7800, "lon": 85.7200},
    "Barhabise": {"lat": 27.7800, "lon": 85.9000},
    "Helambu": {"lat": 28.0100, "lon": 85.5300},
    "Panchpokhari": {"lat": 28.0200, "lon": 85.7100},
    "Sukute": {"lat": 27.7012, "lon": 85.7672},
    "Khadichaur": {"lat": 27.7384, "lon": 85.8188},
    "Jalbire": {"lat": 27.7941, "lon": 85.7892},
    "Tatopani": {"lat": 27.9482, "lon": 85.9412}
}

# Global cache for data and model
inventory_df = pd.DataFrame()
model = None
rainfall_mean = None
rainfall_std = None

def load_resources():
    global inventory_df, model
    if os.path.exists(DATA_PATH) and os.path.exists(MODEL_PATH):
        inventory_df = pd.read_csv(DATA_PATH)
        model = joblib.load(MODEL_PATH)
        # compute rainfall statistics for scaling/adjustment
        global rainfall_mean, rainfall_std
        if 'rainfall_epsg4326' in inventory_df.columns:
            rainfall_mean = float(inventory_df['rainfall_epsg4326'].mean())
            rainfall_std = float(inventory_df['rainfall_epsg4326'].std())
        else:
            rainfall_mean = 0.0
            rainfall_std = 1.0
        print(f"[OK] Resources loaded: {len(inventory_df)} samples available.")
    else:
        print(f"[ERROR] Critical failure: Data or model missing.")

load_resources()

def get_risk_for_df(df, rainfall_mm):
    """Computes risk probabilities for a DataFrame using the RF model and simulated rainfall."""
    if df.empty or model is None:
        return np.zeros(len(df))

    # Scale the simulated rainfall (50-500 mm) to the training data units [12619.97, 28701.98]
    # rainfall_mm can be a scalar or a numpy array/pandas Series
    scaled_rain = 12619.97 + (rainfall_mm - 50.0) * (28701.98 - 12619.97) / (500.0 - 50.0)

    # Create a copy of the dataframe to avoid modifying the original
    temp_df = df.copy()
    temp_df['rainfall_epsg4326'] = scaled_rain

    # Predict baseline probabilities
    raw_probs = model.predict_proba(temp_df[FEATURE_COLS])[:, 1]

    # Map rainfall_mm to a normalized scale [0, 1]
    rain_norm = np.clip((rainfall_mm - 50.0) / (500.0 - 50.0), 0.0, 1.0)
    
    # Calculate a dynamic geo-risk factor using slope
    # slope_norm: 0.0 at 0 deg, 1.0 at 45+ deg
    slope_norm = np.clip(temp_df['slope_epsg4326'] / 45.0, 0.0, 1.0)
    
    # At max rain (500mm), steep slopes get up to 1.2 risk added, easily pushing them over 0.5
    geo_risk = rain_norm * slope_norm * 1.2
    
    # The final probability is the maximum of the baseline model prob and our dynamic geo-risk
    final_probs = np.maximum(raw_probs, geo_risk)

    return np.clip(final_probs, 0.0, 1.0)

def get_risk_for_point(lat, lon, rainfall_mm):
    """Audits risk for a single coordinate using the RF model."""
    if inventory_df.empty or model is None:
        return 0.5

    dist = np.sqrt((inventory_df['latitude'] - lat)**2 + (inventory_df['longitude'] - lon)**2)
    closest_idx = dist.idxmin()
    row = inventory_df.iloc[closest_idx].copy()

    # Predict using the helper function
    single_df = pd.DataFrame([row]).reset_index(drop=True)
    probs = get_risk_for_df(single_df, rainfall_mm)
    return float(probs[0])

@app.route('/api/heatmap', methods=['GET'])
def get_heatmap():
    if inventory_df.empty:
        return jsonify([])
    return jsonify(inventory_df.to_dict(orient='records'))

@app.route('/api/stats', methods=['GET'])
def get_stats():
    if inventory_df.empty:
        return jsonify({"error": "Matrix not loaded"}), 503

    rainfall_str = request.args.get('rainfall_saturation')
    rainfall_val = float(rainfall_str) if (rainfall_str and rainfall_str.strip()) else 250.0

    # Calculate probabilities for all points using the simulated rainfall
    probs = get_risk_for_df(inventory_df, rainfall_val)

    total_count = len(inventory_df)
    vulnerable_count = int((probs > 0.5).sum())

    # Build a regional table using a locality-weighted rainfall modifier so
    # increasing the rainfall_saturation affects municipalities differently.
    regional_table = []
    # Parameters for locality influence: scale controls how quickly influence decays
    influence_scale = 0.05  # ~0.05 degrees ~5km; tweak as needed
    influence_strength = 0.6  # maximum fractional increase at hub center

    for name, coords in HUB_CATALOG.items():
        # distance (degrees) from each inventory point to the hub
        dist = np.sqrt((inventory_df['latitude'] - coords['lat'])**2 + (inventory_df['longitude'] - coords['lon'])**2)

        # local influence factor: inverse-distance Gaussian-like weighting
        influence = np.exp(-(dist / influence_scale) ** 2)

        # per-point local rainfall: hub-proximal points receive a larger share
        local_rainfall = rainfall_val * (1.0 + influence_strength * influence)

        # calculate region probabilities using the helper function
        region_probs = get_risk_for_df(inventory_df, local_rainfall)

        # select points fairly near the hub for the municipality summary
        mask = dist < 0.1
        region_points = region_probs[mask]
        if len(region_points) > 0:
            haz_idx = float(region_points.mean() * 100)
            regional_table.append({
                "municipality": name,
                "vulnerable_percent": round(float((region_points > 0.5).mean() * 100), 2),
                "hazard_index": round(haz_idx, 2),
                "status": "Critical" if haz_idx > 60 else "Warning" if haz_idx > 30 else "Normal"
            })

    return jsonify({
        "sampled_points": total_count,
        "mean_slope_deg": float(inventory_df['slope_epsg4326'].mean()),
        "vulnerable_percentage": float((vulnerable_count / total_count) * 100),
        "regional_table": regional_table
    })

@app.route('/api/risk-score', methods=['POST'])
def post_risk_score():
    data = request.get_json()
    lat, lon = data.get('lat'), data.get('lon')
    rainfall = data.get('rainfall', 250.0)
    
    risk_prob = get_risk_for_point(lat, lon, rainfall)
    risk_score = int(risk_prob * 100)
    
    dist = np.sqrt((inventory_df['latitude'] - lat)**2 + (inventory_df['longitude'] - lon)**2)
    row = inventory_df.iloc[dist.idxmin()]
    
    return jsonify({
        "risk_score": risk_score,
        "label": "Very High" if risk_score > 80 else "High" if risk_score > 60 else "Moderate" if risk_score > 40 else "Low",
        "parameters": row[FEATURE_COLS].to_dict(),
        "matched_coord": {"lat": float(row['latitude']), "lon": float(row['longitude'])}
    })

@app.route('/api/travel-route', methods=['POST'])
def post_travel_route():
    """OSRM-backed Safe Traveler Routing (Task 1.2)"""
    data = request.get_json()
    start_node = data.get('start_node')
    end_node = data.get('end_node')
    rainfall = float(data.get('rainfall_saturation', 250.0))

    if start_node not in HUB_CATALOG or end_node not in HUB_CATALOG:
        return jsonify({"error": "Start or destination node not recognized"}), 400

    start_c = HUB_CATALOG[start_node]
    end_c = HUB_CATALOG[end_node]

    # 1. Fetch real road geometry from OSRM
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_c['lon']},{start_c['lat']};{end_c['lon']},{end_c['lat']}?geometries=geojson&overview=full"
    
    try:
        r = requests.get(osrm_url, timeout=12)
        r_json = r.json()
        if 'routes' not in r_json or not r_json['routes']:
            return jsonify({"error": "No road route found"}), 404
        coordinates = r_json['routes'][0]['geometry']['coordinates'] # [lon, lat]
    except Exception as e:
        return jsonify({"error": f"OSRM Engine Failure: {str(e)}"}), 500

    # 2. Downsample to at most 50 waypoints for fast scoring
    MAX_WAYPOINTS = 50
    if len(coordinates) > MAX_WAYPOINTS:
        step = len(coordinates) / MAX_WAYPOINTS
        coordinates = [coordinates[int(i * step)] for i in range(MAX_WAYPOINTS)]
        coordinates.append(r_json['routes'][0]['geometry']['coordinates'][-1])

    # 3. Audit sampled coordinate pairs
    evaluated_path = []
    max_risk = 0.0

    for lon, lat in coordinates:
        risk_prob = get_risk_for_point(lat, lon, rainfall)
        risk_score = float(risk_prob * 100)
        max_risk = max(max_risk, risk_score)
        evaluated_path.append([lat, lon, risk_score])

    # 3. Formulate Summary (Task 1.2.6)
    if max_risk > 65:
        summary = "CRITICAL HAZARD: Route contains high-risk zones. Essential travel only advised with extreme caution."
    elif max_risk > 30:
        summary = "MODERATE RISK: Be aware of potential delays and localized hazards on mountain sections."
    else:
        summary = "STABLE ROUTE: Geological conditions indicate safe driving conditions for the entire path."

    return jsonify({
        "path": evaluated_path,
        "max_risk": round(max_risk, 1),
        "safety_briefing": summary,
        "origin_name": start_node,
        "destination_name": end_node
    })

@app.route('/api/disasters', methods=['GET'])
def get_disasters():
    disasters = load_disasters()
    return jsonify(disasters)

@app.route('/api/disasters', methods=['POST'])
def post_disaster():
    data = request.get_json()
    lat = data.get('lat')
    lon = data.get('lon')
    desc = data.get('description', 'Disaster reported by user')
    
    if lat is None or lon is None:
        return jsonify({"error": "Latitude and longitude required"}), 400
        
    new_disaster = {
        "id": str(uuid.uuid4()),
        "lat": float(lat),
        "lon": float(lon),
        "description": desc,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    disasters = load_disasters()
    disasters.append(new_disaster)
    save_disasters(disasters)
    
    return jsonify({"message": "Disaster reported successfully", "disaster": new_disaster}), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
