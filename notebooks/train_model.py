import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

def train_landslide_model():
    # Define paths relative to the project root
    # Note: Assuming this script is run from project root, or we use absolute paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'backend', 'data', 'landslide_feature_matrix.csv')
    model_dir = os.path.join(base_dir, 'backend', 'models')
    model_path = os.path.join(model_dir, 'rf_model.pkl')

    # 1. Read the parsed rows
    if not os.path.exists(input_path):
        print(f"Error: Feature matrix not found at {input_path}")
        print("Please run backend/compile_real_dataset.py first.")
        return

    df = pd.read_csv(input_path)
    print(f"Loaded dataset with {len(df)} rows.")

    # 2. Extract features (X) and target (y)
    feature_cols = [
        'dem_epsg4326', 
        'slope_epsg4326', 
        'aspect_epsg4326', 
        'twi_epsg4326', 
        'ndvi_epsg4326', 
        'landcover_epsg4326', 
        'rainfall_epsg4326'
    ]
    
    # Drop rows with NaN values just in case sampling failed for some points
    df_clean = df.dropna(subset=feature_cols + ['landslide_label'])
    
    X = df_clean[feature_cols]
    y = df_clean['landslide_label']

    # 3. 80/20 train-test partition split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Fit a RandomForestClassifier(n_estimators=100, random_state=42)
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # 5. Print out model accuracy and feature importances
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {accuracy:.4f}")

    print("\nFeature Importances:")
    importances = model.feature_importances_
    sorted_idx = importances.argsort()[::-1]
    for i in sorted_idx:
        print(f"  {feature_cols[i]}: {importances[i]:.4f}")

    # Serialize the output binary
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        
    joblib.dump(model, model_path)
    print(f"\nModel successfully serialized to {model_path}")

if __name__ == "__main__":
    train_landslide_model()
