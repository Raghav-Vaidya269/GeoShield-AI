from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import joblib
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Load data structures and model weights directly into memory at server boot
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(base_dir, 'backend', 'data', 'landslide_feature_matrix.csv')
MODEL_PATH = os.path.join(base_dir, 'backend', 'models', 'rf_model.pkl')

# Feature columns from the production spatial compiler
FEATURE_COLS = [
    'dem_epsg4326', 'slope_epsg4326', 'aspect_epsg4326',
    'twi_epsg4326', 'ndvi_epsg4326', 'landcover_epsg4326', 'rainfall_epsg4326'
]

# Check if data and model exist before loading
if not os.path.exists(DATA_PATH) or not os.path.exists(MODEL_PATH):
    print("Warning: Data or model not found. Ensure Task 1 and Task 2 are completed.")
    inventory_df = pd.DataFrame()
    model = None
else:
    inventory_df = pd.read_csv(DATA_PATH)
    model = joblib.load(MODEL_PATH)
    print(f"✅ Feature matrix loaded: {len(inventory_df)} rows | Model ready.")

@app.route('/api/heatmap', methods=['GET'])
def get_heatmap():
    """Returns all records as a JSON list for interactive map plotting."""
    if inventory_df.empty:
        return jsonify({"error": "No data available"}), 404
    return jsonify(inventory_df.to_dict(orient='records'))

@app.route('/api/risk-score', methods=['POST'])
def post_risk_score():
    """
    Accepts user mouse click parameters {lat, lon}.
    Finds closest coordinate, extracts features, and runs prediction.
    """
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
        
    data = request.get_json()
    try:
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid latitude and longitude required"}), 400
    
    # Calculate Euclidean distance to find the closest matching coordinate in the matrix
    distances = np.sqrt((inventory_df['latitude'] - lat)**2 + (inventory_df['longitude'] - lon)**2)
    closest_idx = distances.idxmin()
    closest_row = inventory_df.iloc[closest_idx]
    
    # Extract physical parameters using the strict production feature column list
    features = closest_row[FEATURE_COLS]
    
    # Run predict_proba through the Random Forest binary
    features_reshaped = features.values.reshape(1, -1)
    prob = model.predict_proba(features_reshaped)[0][1] # Probability of landslide (class 1)
    
    risk_percent = int(prob * 100)
    
    # Classified text label
    if risk_percent < 20: label = "Very Low"
    elif risk_percent < 40: label = "Low"
    elif risk_percent < 60: label = "Moderate"
    elif risk_percent < 80: label = "High"
    else: label = "Very High"
    
    return jsonify({
        "risk_score": risk_percent,
        "label": label,
        "parameters": features.to_dict(),
        "matched_coord": {
            "lat": float(closest_row['latitude']),
            "lon": float(closest_row['longitude'])
        }
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Provides dynamically computed analytics from the real compiled feature matrix."""
    if inventory_df.empty:
        return jsonify({"error": "No data available"}), 404

    # Dynamically calculate row count and label breakdown
    inventory_points_used = len(inventory_df)
    landslide_prone = int(inventory_df['landslide_label'].sum())
    safe_points = inventory_points_used - landslide_prone

    stats = {
        "summary": {
            "inventory_points_used": inventory_points_used,
            "total_points": inventory_points_used,
            "landslide_prone_points": landslide_prone,
            "safe_points": safe_points,
            "hazard_distribution": {
                "safe": safe_points,
                "hazard": landslide_prone
            }
        },
        "environmental_averages": inventory_df[FEATURE_COLS].mean().to_dict()
    }
    return jsonify(stats)

if __name__ == '__main__':
    # Flask application tracking paths expected by team frontends
    app.run(host='0.0.0.0', port=5001, debug=True)
