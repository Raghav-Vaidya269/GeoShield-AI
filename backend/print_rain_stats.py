import pandas as pd
import os
p = os.path.join(os.path.dirname(__file__), 'data', 'landslide_feature_matrix.csv')
df = pd.read_csv(p)
print('count', len(df))
print('rainfall min', df['rainfall_epsg4326'].min())
print('rainfall mean', df['rainfall_epsg4326'].mean())
print('rainfall max', df['rainfall_epsg4326'].max())
print('rainfall std', df['rainfall_epsg4326'].std())
