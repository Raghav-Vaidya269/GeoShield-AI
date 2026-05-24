from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import joblib
import numpy as np
import os
import requests

app = Flask(__name__)
CORS(app)

# 1. Physical Sourcing Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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

def load_resources():
    global inventory_df, model
    if os.path.exists(DATA_PATH) and os.path.exists(MODEL_PATH):
        inventory_df = pd.read_csv(DATA_PATH)
        model = joblib.load(MODEL_PATH)
        print(f"✅ Resources loaded: {len(inventory_df)} samples available.")
    else:
        print(f"❌ Critical failure: Data or model missing.")

load_resources()

def get_risk_for_point(lat, lon, rainfall):
    """Audits risk for a single coordinate using the RF model."""
    if inventory_df.empty or model is None:
        return 0.5
        
    dist = np.sqrt((inventory_df['latitude'] - lat)**2 + (inventory_df['longitude'] - lon)**2)
    closest_idx = dist.idxmin()
    row = inventory_df.iloc[closest_idx].copy()
    
    row['rainfall_epsg4326'] = rainfall
    features_df = pd.DataFrame([row[FEATURE_COLS]])
    
    # Return raw probability
    return float(model.predict_proba(features_df)[0][1])

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

    temp_df = inventory_df.copy()
    temp_df['rainfall_epsg4326'] = rainfall_val
    probs = model.predict_proba(temp_df[FEATURE_COLS])[:, 1]
    
    vulnerable_count = int((probs > 0.5).sum())
    total_count = len(inventory_df)

    regional_table = []
    for name, coords in HUB_CATALOG.items():
        dist = np.sqrt((inventory_df['latitude'] - coords['lat'])**2 + (inventory_df['longitude'] - coords['lon'])**2)
        region_pts = probs[dist < 0.1]
        if len(region_pts) > 0:
            haz_idx = float(region_pts.mean() * 100)
            regional_table.append({
                "municipality": name,
                "vulnerable_percent": round(float((region_pts > 0.5).mean() * 100), 2),
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
        r = requests.get(osrm_url, timeout=10)
        r_json = r.json()
        if 'routes' not in r_json or not r_json['routes']:
            return jsonify({"error": "No road route found"}), 404
        coordinates = r_json['routes'][0]['geometry']['coordinates'] # [lon, lat]
    except Exception as e:
        return jsonify({"error": f"OSRM Engine Failure: {str(e)}"}), 500

    # 2. Audit every coordinate pair (Task 1.2.4-5)
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
