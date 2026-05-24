import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from 'react-leaflet';
import axios from 'axios';
import { Activity, AlertTriangle, CloudRain, Info, Layers, Map as MapIcon, MousePointer2, Thermometer, Navigation, Route, ShieldAlert, CheckCircle2 } from 'lucide-react';
import RoutePlanner from './components/RoutePlanner';

const API_BASE = 'http://localhost:5000/api';

const MUNICIPALITIES = ["Melamchi", "Helambu", "Panchpokhari", "Chautara", "Barhabise"];

const NODE_COORDS = {
  "Melamchi": [27.8286, 85.5786],
  "Helambu": [28.0200, 85.5340],
  "Panchpokhari": [28.0167, 85.7333],
  "Chautara": [27.7681, 85.7111],
  "Barhabise": [27.7889, 85.8972]
};

// Component to handle smooth camera transitions
const MapController = ({ points, route }) => {
  const map = useMap();
  useEffect(() => {
    if (route) {
      const firstNode = NODE_COORDS[route.path[0]];
      map.flyTo(firstNode, 11, { duration: 2 });
    } else if (points.length > 0) {
      map.flyTo([27.85, 85.75], 10, { duration: 2.5, easeLinearity: 0.25 });
    }
  }, [points, route, map]);
  return null;
};

const App = () => {
  const [view, setView] = useState('dashboard');
  const [points, setPoints] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [rainfall, setRainfall] = useState(250);
  const [loading, setLoading] = useState(true);

  // Pathfinding State (Dashboard inline version)
  const [startNode, setStartNode] = useState("Melamchi");
  const [endNode, setEndNode] = useState("Barhabise");
  const [travelRoute, setTravelRoute] = useState(null);

  // Synchronized Data Fetching
  const fetchStats = useCallback(async (val) => {
    try {
      const res = await axios.get(`${API_BASE}/stats?rainfall_saturation=${val}`);
      setStats(res.data);
    } catch (err) {
      console.error("Stats handshake failed:", err);
    }
  }, []);

  // Initial Boot
  useEffect(() => {
    const init = async () => {
      try {
        const heatmapRes = await axios.get(`${API_BASE}/heatmap`);
        setPoints(heatmapRes.data);
        await fetchStats(250);
        setLoading(false);
      } catch (err) {
        console.error("Initial boot failed:", err);
        setLoading(false);
      }
    };
    init();
  }, [fetchStats]);

  // Trigger update on slider change
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => fetchStats(rainfall), 150);
      return () => clearTimeout(timer);
    }
  }, [rainfall, fetchStats, loading]);

  const calculateRoute = async () => {
    try {
      const res = await axios.post(`${API_BASE}/travel-route`, {
        start_node: startNode,
        end_node: endNode,
        rainfall_saturation: rainfall
      });
      setTravelRoute(res.data);
    } catch (err) {
      alert("Failed to calculate route: " + (err.response?.data?.error || "Server offline"));
    }
  };

  const handleMarkerClick = async (lat, lon) => {
    try {
      const response = await axios.post(`${API_BASE}/risk-score`, { lat, lon, rainfall });
      setSelectedPoint(response.data);
    } catch (err) {
      console.error("Risk evaluation disconnect:", err);
    }
  };

  const getPointColor = (point) => {
    if (point.landslide_label === 1) return '#ef4444';
    if (rainfall > 350) return '#f97316';
    return '#22c55e';
  };

  const StatsCard = ({ label, value, icon }) => (
    <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 flex items-center gap-4">
      <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-white">{value}</p>
      </div>
    </div>
  );

  const ParameterRow = ({ icon, label, value }) => (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-slate-400">{icon} {label}</div>
      <span className="font-mono font-bold text-slate-200">{value}</span>
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* 30% Analytical Sidebar Sidebar Navigation */}
      <aside className="w-[30%] h-full flex flex-col bg-slate-900 p-6 overflow-y-auto border-r border-white/5 z-30 shadow-2xl">
        <header className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/20">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-emerald-50">GeoShield AI</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Sindhupalchok Sentinel</p>
          </div>
        </header>

        {/* Persistent View Switcher */}
        <nav className="flex items-center gap-2 mb-8 bg-slate-800/50 p-1.5 rounded-2xl border border-white/5">
           <button 
             onClick={() => setView('dashboard')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <MapIcon className="w-3.5 h-3.5" /> District Sandbox
           </button>
           <button 
             onClick={() => setView('routing')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'routing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <Route className="w-3.5 h-3.5" /> High-Res Routing
           </button>
        </nav>

        {view === 'dashboard' ? (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Global Stats Panel */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3 h-3 text-slate-500" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regional Diagnostics</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <StatsCard label="Sampled Points" value={stats?.sampled_points || 0} icon={<Layers className="w-3 h-3"/>} />
                <StatsCard label="Mean Slope" value={`${stats?.mean_slope_deg?.toFixed(1) || 0}°`} icon={<Thermometer className="w-3 h-3"/>} />
              </div>
              
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 uppercase font-black">Hazard Distribution</span>
                  <span className="text-xs font-mono text-red-500 font-black">
                    {stats?.vulnerable_percentage?.toFixed(1) || 0}% Vulnerable
                  </span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden flex shadow-inner">
                  <div 
                    className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-700" 
                    style={{ width: `${100 - (stats?.vulnerable_percentage || 0)}%` }}
                  />
                  <div 
                    className="bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-700" 
                    style={{ width: `${stats?.vulnerable_percentage || 0}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Municipality Data Grid */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-3 h-3 text-slate-500" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Matrix</h2>
              </div>
              <div className="bg-slate-800/30 rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-800/50 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="p-3">Municipality</th>
                      <th className="p-3 text-center">Risk %</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-300">
                    {stats?.regional_table?.map((row, i) => (
                      <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold">{row.municipality}</td>
                        <td className="p-3 text-center font-mono opacity-60">{row.vulnerable_percent}%</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            row.status === 'Critical' ? 'bg-red-500/20 text-red-400' : 
                            row.status === 'Warning' ? 'bg-orange-500/20 text-orange-400' : 
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Inspector Panel */}
            <section className="mt-auto">
              {selectedPoint ? (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-indigo-500/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-black">Risk Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white">{selectedPoint.risk_score}</span>
                        <span className="text-sm font-bold text-slate-500">%</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                      selectedPoint.risk_score > 60 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>{selectedPoint.label}</span>
                  </div>
                  <div className="space-y-2">
                    <ParameterRow icon={<Thermometer className="w-3 h-3 text-orange-400"/>} label="Slope" value={`${selectedPoint.parameters.slope_epsg4326.toFixed(1)}°`} />
                    <ParameterRow icon={<CloudRain className="w-3 h-3 text-blue-400"/>} label="Rainfall" value={`${rainfall}mm`} />
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="w-full mt-4 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">Dismiss</button>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center opacity-40">
                  <MousePointer2 className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Select Point on Grid</p>
                </div>
              )}
            </section>
          </div>
        ) : (
           <div className="flex-1 flex flex-col justify-center items-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl opacity-40 animate-in fade-in slide-in-from-left-4">
              <Navigation className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Infrastructure Audit Mode Active.<br/>Use the control panel for pass evaluation.</p>
           </div>
        )}
      </aside>

      {/* 70% Map / Route Content Viewport */}
      <main className="flex-1 h-full relative">
        {view === 'dashboard' ? (
           <div className="h-full w-full p-4 animate-in fade-in duration-500">
             <div className="h-full w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative">
              <MapContainer center={[27.85, 85.75]} zoom={10} className="h-full w-full">
                <MapController points={points} route={travelRoute} />
                <TileLayer
                  attribution='&copy; CARTO'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                {travelRoute && (
                  <Polyline 
                    positions={travelRoute.path.map(node => NODE_COORDS[node])} 
                    pathOptions={{ color: '#6366f1', weight: 4, dashArray: '10, 10', opacity: 0.8 }} 
                  />
                )}

                {Object.entries(NODE_COORDS).map(([name, pos]) => (
                  <CircleMarker 
                    key={name} center={pos} radius={6} 
                    pathOptions={{ color: '#fff', fillColor: '#6366f1', fillOpacity: 0.9, weight: 2 }}
                  >
                    <Popup><b>Hub: {name}</b></Popup>
                  </CircleMarker>
                ))}
                
                {points.map((pt, idx) => (
                  <CircleMarker
                    key={idx}
                    center={[pt.latitude, pt.longitude]}
                    radius={3}
                    pathOptions={{
                      fillColor: getPointColor(pt),
                      color: '#000',
                      weight: 0.1,
                      fillOpacity: 0.6
                    }}
                    eventHandlers={{ click: () => handleMarkerClick(pt.latitude, pt.longitude) }}
                  />
                ))}

                {/* Dashboard Inline Route Overlay */}
                <div className="absolute top-6 left-6 z-[1000] glass-panel p-5 rounded-2xl w-80 border border-white/10 shadow-2xl space-y-4 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-xs uppercase tracking-widest text-indigo-100 italic">Quick Path Audit</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={startNode} onChange={e => setStartNode(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-[10px] outline-none">{MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <select value={endNode} onChange={e => setEndNode(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-[10px] outline-none">{MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  </div>
                  <button onClick={calculateRoute} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 tracking-widest transition-all">Go</button>
                </div>

                {/* Rainfall HUD */}
                <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-6 rounded-2xl w-80 border border-white/5 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-4">
                    <CloudRain className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-sm tracking-tight italic">Monsoon Sim</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Saturation</span>
                      <span className={rainfall > 350 ? 'text-red-400' : 'text-blue-400'}>{rainfall}mm</span>
                    </div>
                    <input type="range" min="50" max="500" value={rainfall} onChange={(e) => setRainfall(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                  </div>
                </div>
              </MapContainer>
             </div>
           </div>
        ) : (
           <div className="h-full w-full animate-in fade-in slide-in-from-right-10 duration-500">
             <RoutePlanner />
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
