import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import { ChevronRight, CloudRain, Navigation, AlertTriangle, ShieldCheck, MapPin, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const HUBS = [
  "Melamchi", "Chautara", "Barhabise", "Helambu", 
  "Panchpokhari", "Sukute", "Khadichaur", "Jalbire", "Tatopani"
];

const RouteController = ({ path }) => {
  const map = useMap();
  React.useEffect(() => {
    if (path && path.length > 0) {
      const bounds = path.map(p => [p[0], p[1]]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [path, map]);
  return null;
};

const RoutePlanner = ({ rainfall, setRainfall, theme = 'dark' }) => {
  const [startNode, setStartNode] = useState(HUBS[0]);
  const [endNode, setEndNode] = useState(HUBS[2]);
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);

  const performAudit = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/travel-route`, {
        start_node: startNode,
        end_node: endNode,
        rainfall_saturation: rainfall
      });
      setRouteData(response.data);
    } catch (err) {
      console.error("Audit failed:", err);
      alert("Routing engine failed to resolve path.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score > 65) return '#EF4444'; // hazardous red
    if (score > 30) return '#F59E0B'; // warning yellow
    return '#10B981'; // clean green
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Top Configuration Bar */}
      <header className="p-6 bg-white dark:bg-slate-900 border-b border-black/10 dark:border-white/5 flex items-center justify-between shadow-xl z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest block">Start Station</label>
              <select 
                value={startNode} onChange={e => setStartNode(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 ring-emerald-500 transition-all text-slate-900 dark:text-white w-48"
              >
                {HUBS.map(hub => <option key={hub} value={hub}>{hub}</option>)}
              </select>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 self-end mb-3" />
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest block">Destination</label>
              <select 
                value={endNode} onChange={e => setEndNode(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 ring-emerald-500 transition-all text-slate-900 dark:text-white w-48"
              >
                {HUBS.map(hub => <option key={hub} value={hub}>{hub}</option>)}
              </select>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800" />

          <div className="space-y-1 w-64">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest block">Rainfall Saturation</label>
              <span className="text-xs font-mono text-blue-400 font-bold">{rainfall}mm</span>
            </div>
            <input 
              type="range" min="50" max="500" value={rainfall}
              onChange={e => setRainfall(parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>

        <button 
          onClick={performAudit} disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:dark:bg-slate-700 transition-all px-8 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-900/20"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5 text-white" />}
          <span className="text-sm font-black uppercase tracking-widest text-white">Audit Route</span>
        </button>
      </header>

      {/* Map & Summary View */}
      <div className="flex-1 relative flex">
        <div className="flex-1 z-10">
          <MapContainer center={[27.85, 85.75]} zoom={10} className="h-full w-full">
            <TileLayer
              attribution='&copy; CARTO'
              url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
            />
            <RouteController path={routeData?.path} />
            
            {routeData && (
              <>
                {/* Segmented Polyline Visualization (Task 2.4) */}
                {routeData.path.map((point, index) => {
                  if (index === 0) return null;
                  const prev = routeData.path[index - 1];
                  // Color based on risk of the current point
                  return (
                    <Polyline 
                      key={index}
                      positions={[[prev[0], prev[1]], [point[0], point[1]]]}
                      pathOptions={{ color: getRiskColor(point[2]), weight: 6, lineCap: 'round', opacity: 0.9 }}
                    />
                  );
                })}
                
                <Marker position={[routeData.path[0][0], routeData.path[0][1]]}>
                  <Popup>Origin: {routeData.origin_name}</Popup>
                </Marker>
                <Marker position={[routeData.path[routeData.path.length-1][0], routeData.path[routeData.path.length-1][1]]}>
                  <Popup>Destination: {routeData.destination_name}</Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>

        {/* Floating Summary Panel (Task 2.5) */}
        {routeData && (
          <aside className="absolute top-6 right-6 z-[1000] w-96 glass-panel p-6 rounded-3xl border border-black/20 dark:border-white/10 shadow-2xl space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${routeData.max_risk > 65 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                {routeData.max_risk > 65 ? <AlertTriangle className="w-6 h-6 text-red-400" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Route Risk Audit</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-tight">OSRM Geographic Analysis</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-black/10 dark:border-white/5">
                  <p className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">Peak Hazard Score</p>
                  <p className={`text-2xl font-black ${routeData.max_risk > 65 ? 'text-red-400' : 'text-emerald-400'}`}>{routeData.max_risk}%</p>
               </div>
               <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-black/10 dark:border-white/5">
                  <p className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">Data Segments</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{routeData.path.length}</p>
               </div>
            </div>

            <div className={`p-4 rounded-2xl border ${routeData.max_risk > 65 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} space-y-2`}>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3" /> System Recommendation
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600 dark:text-slate-300 leading-relaxed italic font-medium">"{routeData.safety_briefing}"</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default RoutePlanner;
