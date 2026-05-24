import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from 'react-leaflet';
import axios from 'axios';
import { Activity, AlertTriangle, CloudRain, Info, Layers, Map as MapIcon, MousePointer2, Thermometer, Navigation, Route, ShieldAlert, CheckCircle2, BellRing, X, Moon, Sun } from 'lucide-react';
import RoutePlanner from './components/RoutePlanner';
import DisasterReporter from './components/DisasterReporter';
import HomePage from './components/HomePage';

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
    if (route && route.path && route.path.length > 0) {
      const firstPoint = route.path[0];
      map.flyTo([firstPoint[0], firstPoint[1]], 11, { duration: 2 });
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
  const [theme, setTheme] = useState('light');
  const [isAppStarted, setIsAppStarted] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Pathfinding State
  const [startNode, setStartNode] = useState("Melamchi");
  const [endNode, setEndNode] = useState("Barhabise");
  const [travelRoute, setTravelRoute] = useState(null);

  // Alert System State
  const [knownDisasterIds, setKnownDisasterIds] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const isFirstLoad = useRef(true);

  const showToast = (message, subtext) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, subtext }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 7000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Poll for disasters globally
  useEffect(() => {
    const checkDisasters = async () => {
      try {
        const res = await axios.get(`${API_BASE}/disasters`);
        const currentDisasters = res.data;
        
        if (isFirstLoad.current) {
          setKnownDisasterIds(new Set(currentDisasters.map(d => d.id)));
          isFirstLoad.current = false;
          return;
        }

        let newIds = new Set(knownDisasterIds);
        let hasNew = false;
        
        currentDisasters.forEach(d => {
          if (!knownDisasterIds.has(d.id)) {
            hasNew = true;
            newIds.add(d.id);
            showToast("New Hazard Alert", d.description || `Hazard reported at ${d.lat.toFixed(4)}, ${d.lon.toFixed(4)}`);
          }
        });
        
        if (hasNew) {
          setKnownDisasterIds(newIds);
        }
      } catch (err) {
        console.error("Disaster polling failed:", err);
      }
    };
    
    checkDisasters();
    const interval = setInterval(checkDisasters, 5000);
    return () => clearInterval(interval);
  }, [knownDisasterIds]);

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
    
    // Mirror backend geo_risk calculation for live color updating
    const rainNorm = Math.min(Math.max((rainfall - 50) / 450, 0), 1);
    const slopeNorm = Math.min(Math.max(point.slope_epsg4326 / 45.0, 0), 1);
    const geoRisk = rainNorm * slopeNorm * 1.2;

    if (geoRisk > 0.5) return '#ef4444'; // High risk (Red)
    if (geoRisk > 0.3) return '#f59e0b'; // Moderate risk (Orange)
    return '#10b981'; // Safe (Emerald)
  };

  const StatsCard = ({ label, value, icon }) => (
    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-black/10 dark:border-white/5 flex items-center gap-4">
      <div className="p-2 bg-slate-200 dark:bg-slate-700/50 rounded-lg text-slate-500 dark:text-slate-500 dark:text-slate-400">{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  const ParameterRow = ({ icon, label, value }) => (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500 dark:text-slate-400">{icon} {label}</div>
      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );

  if (!isAppStarted) {
    return <HomePage onOpenMap={() => setIsAppStarted(true)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden font-sans">
      {/* Back to Home floating button */}
      <button
        onClick={() => setIsAppStarted(false)}
        title="Back to Home"
        className="fixed bottom-6 right-6 z-[9999] group flex items-center gap-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 shadow-[0_8px_32px_rgba(16,185,129,0.18)] rounded-2xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(16,185,129,0.28)] hover:border-emerald-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Home
      </button>

      {/* Global Alerts Overlay */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto bg-white dark:bg-slate-900 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] rounded-xl p-4 flex items-start gap-4 min-w-[300px] animate-in slide-in-from-right-10 fade-in duration-300">
            <div className="p-2 bg-red-500/20 rounded-full shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 pt-0.5">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-red-400 mb-1">{toast.message}</h4>
              <p className="text-xs text-slate-400 dark:text-slate-600 dark:text-slate-300 leading-snug">{toast.subtext}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:text-white transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 30% Analytical Sidebar Sidebar Navigation */}
      <aside className="w-[30%] h-full flex flex-col bg-white dark:bg-slate-900 p-6 overflow-y-auto border-r border-black/10 dark:border-white/5 z-30 shadow-2xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/20">
              <Activity className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic text-emerald-600 dark:text-emerald-50">GeoShield AI</h1>
              <p className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">Sindhupalchok Sentinel</p>
            </div>
          </div>
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Persistent View Switcher */}
        <nav className="flex items-center gap-2 mb-8 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-black/10 dark:border-white/5">
           <button 
             onClick={() => setView('dashboard')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-emerald-600 text-slate-900 dark:text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 dark:text-slate-500 hover:text-slate-400 dark:text-slate-600 dark:text-slate-300'}`}
           >
             <MapIcon className="w-3.5 h-3.5" /> District Sandbox
           </button>
           <button 
             onClick={() => setView('routing')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'routing' ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 dark:text-slate-500 hover:text-slate-400 dark:text-slate-600 dark:text-slate-300'}`}
           >
             <Route className="w-3.5 h-3.5" /> High-Res Routing
           </button>
           <button 
             onClick={() => setView('alerts')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'alerts' ? 'bg-red-600 text-slate-900 dark:text-white shadow-lg shadow-red-900/40' : 'text-slate-500 dark:text-slate-500 hover:text-slate-400 dark:text-slate-600 dark:text-slate-300'}`}
           >
             <BellRing className="w-3.5 h-3.5" /> Live Alerts
           </button>
        </nav>

        {view === 'dashboard' ? (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Global Stats Panel */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3 h-3 text-slate-500 dark:text-slate-500" />
                <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-500 dark:text-slate-400 uppercase tracking-widest">Regional Diagnostics</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <StatsCard label="Sampled Points" value={stats?.sampled_points || 0} icon={<Layers className="w-3 h-3"/>} />
                <StatsCard label="Mean Slope" value={`${stats?.mean_slope_deg?.toFixed(1) || 0}°`} icon={<Thermometer className="w-3 h-3"/>} />
              </div>
              
              <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-black/10 dark:border-white/5 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-500 dark:text-slate-500 uppercase font-black">Hazard Distribution</span>
                  <span className="text-xs font-mono text-red-500 font-black">
                    {stats?.vulnerable_percentage?.toFixed(1) || 0}% Vulnerable
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden flex shadow-inner">
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
                <ShieldAlert className="w-3 h-3 text-slate-500 dark:text-slate-500" />
                <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-500 dark:text-slate-400 uppercase tracking-widest">Risk Matrix</h2>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/30 rounded-2xl border border-black/10 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="p-3">Municipality</th>
                      <th className="p-3 text-center">Risk %</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-400 dark:text-slate-600 dark:text-slate-300">
                    {stats?.regional_table?.map((row, i) => (
                      <tr key={i} className="border-t border-black/10 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors">
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
                      <p className="text-[9px] text-slate-500 dark:text-slate-500 uppercase font-black">Risk Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{selectedPoint.risk_score}</span>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-500">%</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                      selectedPoint.risk_score > 60 ? 'bg-red-500 text-slate-900 dark:text-white' : 'bg-emerald-500 text-slate-900 dark:text-white'
                    }`}>{selectedPoint.label}</span>
                  </div>
                  <div className="space-y-2">
                    <ParameterRow icon={<Thermometer className="w-3 h-3 text-orange-400"/>} label="Slope" value={`${selectedPoint.parameters.slope_epsg4326.toFixed(1)}°`} />
                    <ParameterRow icon={<CloudRain className="w-3 h-3 text-blue-400"/>} label="Rainfall" value={`${rainfall}mm`} />
                  </div>
                  <button onClick={() => setSelectedPoint(null)} className="w-full mt-4 py-2 text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:text-white transition-colors">Dismiss</button>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center opacity-40">
                  <MousePointer2 className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Select Point on Grid</p>
                </div>
              )}
            </section>
          </div>
        ) : view === 'routing' ? (
           <div className="flex-1 flex flex-col justify-center items-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-40 animate-in fade-in slide-in-from-left-4">
              <Navigation className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest leading-relaxed">Infrastructure Audit Mode Active.<br/>Use the control panel for pass evaluation.</p>
           </div>
        ) : (
           <div className="flex-1 flex flex-col justify-center items-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-40 animate-in fade-in slide-in-from-left-4">
              <ShieldAlert className="w-12 h-12 text-red-900 mb-4" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest leading-relaxed">Alert Center Active.<br/>Monitor crowdsourced disaster reports.</p>
           </div>
        )}
      </aside>

      {/* 70% Map / Route Content Viewport */}
      <main className="flex-1 h-full relative">
        {view === 'dashboard' ? (
           <div className="h-full w-full p-4 animate-in fade-in duration-500">
             <div className="h-full w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/5 relative">
              <MapContainer center={[27.85, 85.75]} zoom={10} className="h-full w-full">
                <MapController points={points} route={travelRoute} />
                <TileLayer
                  attribution='&copy; CARTO'
                  url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                />
                
                {travelRoute && travelRoute.path && travelRoute.path.length > 1 && (
                  <>
                    {travelRoute.path.map((point, index) => {
                      if (index === 0) return null;
                      const prev = travelRoute.path[index - 1];
                      const riskScore = point[2] || 0;
                      const segColor = riskScore > 65 ? '#EF4444' : riskScore > 30 ? '#F59E0B' : '#6366f1';
                      return (
                        <Polyline
                          key={index}
                          positions={[[prev[0], prev[1]], [point[0], point[1]]]}
                          pathOptions={{ color: segColor, weight: 4, dashArray: '10, 10', opacity: 0.85 }}
                        />
                      );
                    })}
                  </>
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
                <div className="absolute top-6 left-6 z-[1000] glass-panel p-5 rounded-2xl w-80 border border-black/20 dark:border-white/10 shadow-2xl space-y-4 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-xs uppercase tracking-widest text-indigo-100 italic">Quick Path Audit</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={startNode} onChange={e => setStartNode(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-[10px] outline-none">{MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <select value={endNode} onChange={e => setEndNode(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-[10px] outline-none">{MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  </div>
                  <button onClick={calculateRoute} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 tracking-widest transition-all">Go</button>
                </div>

                {/* Rainfall HUD */}
                <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-6 rounded-2xl w-80 border border-black/10 dark:border-white/5 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-4">
                    <CloudRain className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-sm tracking-tight italic">Monsoon Sim</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 dark:text-slate-400">
                      <span>Saturation</span>
                      <span className={rainfall > 350 ? 'text-red-400' : 'text-blue-400'}>{rainfall}mm</span>
                    </div>
                    <input type="range" min="50" max="500" value={rainfall} onChange={(e) => setRainfall(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                  </div>
                </div>
              </MapContainer>
             </div>
           </div>
        ) : view === 'routing' ? (
           <div className="h-full w-full animate-in fade-in slide-in-from-right-10 duration-500">
             <RoutePlanner rainfall={rainfall} setRainfall={setRainfall} theme={theme} />
           </div>
        ) : (
           <div className="h-full w-full animate-in fade-in slide-in-from-right-10 duration-500">
             <DisasterReporter theme={theme} />
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
