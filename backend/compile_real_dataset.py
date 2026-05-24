import rasterio
import pandas as pd
import numpy as np
import os
import random

def compile_dense_dataset():
    # Define absolute paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    tif_dir = os.path.join(base_dir, 'data', 'tifData')
    output_path = os.path.join(base_dir, 'data', 'landslide_feature_matrix.csv')

    tif_names = [
        'dem_epsg4326',
        'slope_epsg4326',
        'aspect_epsg4326',
        'twi_epsg4326',
        'ndvi_epsg4326',
        'landcover_epsg4326',
        'rainfall_epsg4326'
    ]

    # 1. Open baseline layer (DEM) to determine structure
    baseline_tif = os.path.join(tif_dir, 'dem_epsg4326.tif')
    if not os.path.exists(baseline_tif):
        print(f"Error: Baseline DEM not found at {baseline_tif}")
        return

    with rasterio.open(baseline_tif) as src:
        width = src.width
        height = src.height
        transform = src.transform
        baseline_nodata = src.nodata

    print(f"Generating samples for raster size: {width}x{height}")

    # 2. Implement random coordinates engine (targeting 10,000 locations)
    num_samples = 10000
    candidate_pixels = []
    for _ in range(num_samples):
        # Generate random pixel coordinates
        row = random.randint(0, height - 1)
        col = random.randint(0, width - 1)
        candidate_pixels.append((col, row))

    # Convert pixels to geographic coordinates (lon, lat)
    coords = [transform * (c, r) for c, r in candidate_pixels]
    
    # 3. Extract pixel values across all 7 layers
    data_matrix = {
        'longitude': [c[0] for c in coords], 
        'latitude': [c[1] for c in coords]
    }

    print(f"Sampling {num_samples} coordinates across all layers...")

    for name in tif_names:
        tif_path = os.path.join(tif_dir, f'{name}.tif')
        if not os.path.exists(tif_path):
            print(f"Warning: {name}.tif not found.")
            data_matrix[name] = [np.nan] * num_samples
            continue
            
        with rasterio.open(tif_path) as src:
            nodata_val = src.nodata
            # Use src.sample tool
            sampled = list(src.sample(coords))
            # Convert to float and handle NoData values explicitly
            vals = []
            for s in sampled:
                val = float(s[0])
                if val == nodata_val or np.isnan(val):
                    vals.append(np.nan)
                else:
                    vals.append(val)
            data_matrix[name] = vals
            print(f"  Processed {name}")

    # Create DataFrame
    df = pd.DataFrame(data_matrix)

    # 4. Drop points that read as NoData values
    initial_len = len(df)
    df = df.dropna(subset=tif_names)
    
    # Additional clean-up: remove common sentinel nodata values like -9999
    # (since some TIFFs might not have Nodata metadata set correctly)
    for col in tif_names:
        df = df[df[col] > -999] 

    print(f"Cleaned dataset: {len(df)} rows remaining (dropped {initial_len - len(df)} NoData/OOB points).")

    # 5. Apply deterministic geographic assignment rule for landslide_label
    # (High risk if slope_epsg4326 > 28 and ndvi_epsg4326 < 0.25)
    df['landslide_label'] = np.where(
        (df['slope_epsg4326'] > 28) & (df['ndvi_epsg4326'] < 0.25),
        1,
        0
    )

    label_counts = df['landslide_label'].value_counts()
    print(f"Label Distribution: 1: {label_counts.get(1, 0)}, 0: {label_counts.get(0, 0)}")

    # 6. Export to CSV
    df.to_csv(output_path, index=False)
    print(f"\nFinalized dense feature matrix: {output_path}")

if __name__ == "__main__":
    compile_dense_dataset()
