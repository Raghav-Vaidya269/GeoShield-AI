import pandas as pd
import numpy as np
import os

# Define bounds for Sindhupalchok District
LAT_RANGE = (27.65, 28.05)
LON_RANGE = (85.50, 85.95)
ELEVATION_RANGE = (900, 4500)
SLOPE_RANGE = (5, 55)
ASPECT_RANGE = (0, 360)
TWI_RANGE = (2, 14)
NDVI_RANGE = (0.05, 0.85)
ROAD_DIST_RANGE = (10, 3000)
RIVER_DIST_RANGE = (5, 2000)
RAINFALL_RANGE = (100, 450)

NUM_ROWS = 500

def generate_data():
    """Generates synthetic geospatial data for landslide susceptibility modeling."""
    np.random.seed(42)
    
    data = {
        'latitude': np.random.uniform(*LAT_RANGE, NUM_ROWS),
        'longitude': np.random.uniform(*LON_RANGE, NUM_ROWS),
        'elevation_m': np.random.uniform(*ELEVATION_RANGE, NUM_ROWS),
        'slope_deg': np.random.uniform(*SLOPE_RANGE, NUM_ROWS),
        'aspect_deg': np.random.uniform(*ASPECT_RANGE, NUM_ROWS),
        'twi_score': np.random.uniform(*TWI_RANGE, NUM_ROWS),
        'ndvi_score': np.random.uniform(*NDVI_RANGE, NUM_ROWS),
        'dist_to_road_m': np.random.uniform(*ROAD_DIST_RANGE, NUM_ROWS),
        'dist_to_river_m': np.random.uniform(*RIVER_DIST_RANGE, NUM_ROWS),
        'historical_rainfall_mm': np.random.uniform(*RAINFALL_RANGE, NUM_ROWS),
    }
    
    df = pd.DataFrame(data)
    
    # Implement structural rule for landslide_label (1 = landslide, 0 = stable)
    # Failures correlate with: 
    # - steep slopes (>28°)
    # - high rainfall (>250mm)
    # - low NDVI (bare soil)
    # - proximity to road
    
    # Calculate a risk score based on normalized factors
    slope_risk = (df['slope_deg'] - 28).clip(0, 55-28) / (55-28)
    rainfall_risk = (df['historical_rainfall_mm'] - 250).clip(0, 450-250) / (450-250)
    ndvi_risk = (0.3 - df['ndvi_score']).clip(0, 0.3-0.05) / (0.3-0.05)
    road_risk = (500 - df['dist_to_road_m']).clip(0, 500-10) / (500-10)
    
    # Combine risks with weights
    combined_score = (
        0.4 * slope_risk + 
        0.3 * rainfall_risk + 
        0.2 * ndvi_risk + 
        0.2 * road_risk + 
        np.random.normal(0, 0.1, NUM_ROWS) # Noise
    )
    
    # Assign label based on score threshold
    df['landslide_label'] = (combined_score > 0.4).astype(int)
    
    # Resolve project root dynamically
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'backend', 'data')
    output_path = os.path.join(data_dir, 'synthetic_landslide_inventory.csv')

    # Ensure directory exists
    os.makedirs(data_dir, exist_ok=True)
    
    # Save to CSV
    df.to_csv(output_path, index=False)
    
    print(f"✅ Generated {NUM_ROWS} rows of synthetic data at {output_path}")
    print("Class Distribution:")
    print(df['landslide_label'].value_counts())

if __name__ == "__main__":
    generate_data()
