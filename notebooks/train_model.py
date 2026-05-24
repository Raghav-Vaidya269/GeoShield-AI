import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

def train():
    """Builds, evaluates, and serializes the Random Forest landslide classifier."""
    data_path = 'backend/data/synthetic_landslide_inventory.csv'
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found. Run generate_synthetic_data.py first.")
        return

    print("Loading data...")
    df = pd.read_csv(data_path)
    
    # Separate features and target, explicitly dropping coordinates from training split
    X = df.drop(['latitude', 'longitude', 'landslide_label'], axis=1)
    y = df['landslide_label']
    
    # 80/20 train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Classifier...")
    # Parameters specified in Task 2
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    clf.fit(X_train, y_train)
    
    # Predictions for evaluation
    y_pred = clf.predict(X_test)
    
    # Validation diagnostics
    print("\n--- Model Evaluation Metrics ---")
    print(f"Accuracy Score: {accuracy_score(y_test, y_pred):.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Detailed feature importance matrix
    print("\n--- Feature Importance Matrix ---")
    importances = clf.feature_importances_
    features = X.columns
    importance_df = pd.DataFrame({'Feature': features, 'Importance': importances})
    importance_df = importance_df.sort_values(by='Importance', ascending=False)
    print(importance_df.to_string(index=False))
    
    # Serialize model artifact
    os.makedirs('backend/models', exist_ok=True)
    model_path = 'backend/models/rf_model.pkl'
    joblib.dump(clf, model_path)
    print(f"\n✅ Trained binary artifact saved to {model_path}")

if __name__ == "__main__":
    train()
