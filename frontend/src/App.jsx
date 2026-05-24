import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import { Activity, AlertTriangle, CloudRain, Info, Layers, Map as MapIcon, MousePointer2, Thermometer } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

// Component to handle smooth camera transitions
const MapController = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      // Smoothly animate and lock into Sindhupalchok once points are loaded
      map.flyTo([27.79, 85.72], 10, {
        duration: 2.5,
        easeLinearity: 0.25
      });
    }
  }, [points, map]);
  return null;
};

const App = () => {
  const [points, setPoints] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [rainfall, setRainfall] = useState(250);
  const [loading, setLoading] = useState(true);

  // Initial Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [heatmapRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/heatmap`),
          axios.get(`${API_BASE}/stats`)
        ]);
        setPoints(heatmapRes.data);
        setStats(statsRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle Marker Click
  const handleMarkerClick = async (lat, lon) => {
    try {
      const response = await axios.post(`${API_BASE}/risk-score`, { lat, lon });
      setSelectedPoint(response.data);
    } catch (err) {
      console.error("Failed to fetch risk score:", err);
    }
  };

  // Dynamic Color Logic — using production column names
  const getPointColor = (point) => {
    if (point.landslide_label === 1) return '#ef4444'; // Bright Red
    if (rainfall > 400) return '#f97316'; // Orange
    if (rainfall > 350 && point.slope_epsg4326 > 30) return '#f97316';
    return '#22c55e'; // Bright Green
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* 70% Constrained Map Container */}
      <main className="relative w-[70%] h-full p-4 bg-slate-950 border-r border-slate-900/50 flex flex-col">
        <div className="flex-1 rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative group">
          <MapContainer 
            center={[28.3949, 84.1240]} 
            zoom={7} 
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            {/* Camera Handling Controller */}
            <MapController points={points} />

            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {points.map((pt, idx) => (
              <CircleMarker
                key={idx}
                center={[pt.latitude, pt.longitude]}
                radius={4}
                pathOptions={{
                  fillColor: getPointColor(pt),
                  color: '#000',
                  weight: 0.5,
                  opacity: 0.8,
                  fillOpacity: 0.7
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(pt.latitude, pt.longitude),
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-slate-900 font-bold p-1">
                    Risk Matrix Node: {idx}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Floating Simulation HUD Overlay */}
            <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-6 rounded-2xl shadow-2xl w-80 border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <CloudRain className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-base tracking-tight">☔ Monsoon Rainfall Simulation</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Saturation Level</span>
                  <span className={rainfall > 400 ? 'text-red-400' : 'text-blue-400'}>{rainfall}mm</span>
                </div>
                <input 
                  type="range" min="50" max="500" value={rainfall} 
                  onChange={(e) => setRainfall(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </MapContainer>
        </div>
      </main>

      {/* 30% Analytical Sidebar Sidebar Dashboard */}
      <aside className="w-[30%] h-full flex flex-col bg-slate-900 p-6 overflow-y-auto border-l border-slate-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-emerald-500/20 rounded-xl">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">GeoShield AI</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sindhupalchok Sentinel</p>
          </div>
        </div>

        {/* System Stats Panel */}
        <section className="mb-10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Regional Diagnostics</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase font-black">Sampled Points</p>
              <p className="text-2xl font-mono font-bold text-slate-200">{stats?.summary?.inventory_points_used?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase font-black">Mean Slope</p>
              <p className="text-2xl font-mono font-bold text-slate-200">
                {stats?.environmental_averages?.slope_epsg4326?.toFixed(1) || 0}°
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
             <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-slate-500 uppercase font-black">Hazard Distribution</span>
                <span className="text-xs font-mono text-red-400 font-bold">
                  {((stats?.summary?.landslide_prone_points / stats?.summary?.total_points) * 100).toFixed(1)}% Vulnerable
                </span>
             </div>
             <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full" 
                  style={{ width: `${(stats?.summary?.safe_points / stats?.summary?.total_points) * 100}%` }}
                />
                <div 
                  className="bg-red-500 h-full" 
                  style={{ width: `${(stats?.summary?.landslide_prone_points / stats?.summary?.total_points) * 100}%` }}
                />
             </div>
          </div>
        </section>

        {/* Geospatial Inspector */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <MousePointer2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Geospatial Inspector</h2>
          </div>

          {!selectedPoint ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-600">
              <div className="p-4 bg-slate-800/30 rounded-full mb-4">
                <MapIcon className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-xs font-medium max-w-[200px]">Click a coordinate marker on the map grid to analyze site-specific risk factors.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Risk Score Header */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-xl overflow-hidden relative">
                <div className={`absolute top-0 right-0 px-4 py-1.5 text-[10px] font-black uppercase rounded-bl-xl ${
                  selectedPoint.risk_score > 60 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {selectedPoint.label}
                </div>
                
                <p className="text-xs text-slate-500 uppercase font-black mb-1">Inference Risk Probability</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-black tracking-tighter text-slate-100">{selectedPoint.risk_score}</span>
                  <span className="text-xl font-bold text-slate-500">%</span>
                </div>
                
                <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${selectedPoint.risk_score > 60 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${selectedPoint.risk_score}%` }}
                  />
                </div>
              </div>

              {/* Underlying Metrics */}
              <div className="space-y-3">
                <ParameterRow 
                  icon={<Thermometer className="w-4 h-4 text-orange-400"/>} 
                  label="Slope" 
                  value={`${selectedPoint.parameters.slope_epsg4326?.toFixed(1)}°`} 
                />
                <ParameterRow 
                  icon={<Activity className="w-4 h-4 text-emerald-400"/>} 
                  label="NDVI" 
                  value={selectedPoint.parameters.ndvi_epsg4326?.toFixed(4)} 
                />
                <ParameterRow 
                  icon={<AlertTriangle className="w-4 h-4 text-blue-400"/>} 
                  label="Elevation" 
                  value={`${selectedPoint.parameters.dem_epsg4326?.toFixed(0)}m`} 
                />
                <ParameterRow 
                  icon={<CloudRain className="w-4 h-4 text-cyan-400"/>} 
                  label="Rainfall" 
                  value={`${selectedPoint.parameters.rainfall_epsg4326?.toFixed(0)}mm`} 
                />
                <ParameterRow 
                  icon={<Info className="w-4 h-4 text-slate-400"/>} 
                  label="Matched Cell" 
                  value={`${selectedPoint.matched_coord.lat.toFixed(4)}, ${selectedPoint.matched_coord.lon.toFixed(4)}`} 
                />
              </div>

              <button 
                onClick={() => setSelectedPoint(null)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Clear Selection
              </button>
            </div>
          )}
        </section>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-800/50">
           <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-black">
              <span>Sync Status</span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Production Stream
              </span>
           </div>
        </div>
      </aside>
    </div>
  );
};

const ParameterRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-[10px] text-slate-400 uppercase font-black">{label}</span>
    </div>
    <span className="text-sm font-mono font-bold text-slate-100">{value}</span>
  </div>
);

export default App;
