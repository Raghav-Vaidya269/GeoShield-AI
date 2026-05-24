import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { ShieldAlert, MapPin, Send, Loader2 } from 'lucide-react';
import L from 'leaflet';

const API_BASE = 'http://localhost:5000/api';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom disaster icon
const disasterIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/2.0.2/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom selection icon
const selectionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/2.0.2/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapClickHandler = ({ setDraftPoint }) => {
  useMapEvents({
    click(e) {
      setDraftPoint(e.latlng);
    },
  });
  return null;
};

const DisasterReporter = ({ theme = 'dark' }) => {
  const [disasters, setDisasters] = useState([]);
  const [draftPoint, setDraftPoint] = useState(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const fetchDisasters = async () => {
    try {
      const res = await axios.get(`${API_BASE}/disasters`);
      setDisasters(res.data);
    } catch (err) {
      console.error("Failed to fetch disasters", err);
    }
  };

  useEffect(() => {
    fetchDisasters();
    // Poll every 5 seconds
    const interval = setInterval(fetchDisasters, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draftPoint) {
      setError("Please select a location on the map first.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      await axios.post(`${API_BASE}/disasters`, {
        lat: draftPoint.lat,
        lon: draftPoint.lng,
        description: description || "User reported disaster"
      });
      
      setSuccess(true);
      setDraftPoint(null);
      setDescription('');
      fetchDisasters(); // Refresh list immediately
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to report disaster. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-950">
      {/* Sidebar Form */}
      <div className="w-[30%] h-full p-6 flex flex-col bg-white dark:bg-slate-900 border-r border-black/10 dark:border-white/5 z-10 overflow-y-auto shadow-2xl">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-black uppercase tracking-widest text-red-600 dark:text-red-50">Active Threats</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Crowdsourced Real-time Disaster Alerts</p>
        </header>

        <form onSubmit={handleSubmit} className="mb-8 bg-slate-100 dark:bg-slate-800/40 p-5 rounded-2xl border border-black/10 dark:border-white/5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2">Report New Hazard</h3>
          
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 flex justify-between">
              Location <span className={draftPoint ? 'text-emerald-400' : 'text-orange-400'}>{draftPoint ? 'Selected' : 'Click on map'}</span>
            </label>
            <div className={`p-3 rounded-xl border ${draftPoint ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50'} text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center gap-2`}>
              <MapPin className={`w-4 h-4 ${draftPoint ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-500'}`} />
              {draftPoint ? `${draftPoint.lat.toFixed(4)}, ${draftPoint.lng.toFixed(4)}` : 'Awaiting coordinates...'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">Description</label>
            <textarea 
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-500/50 resize-none h-24"
              placeholder="E.g., Landslide blocking road..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <div className="text-[10px] font-bold text-red-400 bg-red-500/10 p-2 rounded-lg">{error}</div>}
          {success && <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">Alert Broadcasted Successfully</div>}

          <button 
            type="submit" 
            disabled={isSubmitting || !draftPoint}
            className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              isSubmitting || !draftPoint 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white shadow-lg shadow-red-900/40'
            }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Broadcast Alert
          </button>
        </form>

        {/* List of active alerts */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 sticky top-0 bg-white dark:bg-slate-900 py-2">Live Reports ({disasters.length})</h3>
          {disasters.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-500 text-xs">
              No active alerts reported.
            </div>
          ) : (
            disasters.slice().reverse().map((d) => (
              <div key={d.id} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-wider bg-red-500/20 px-2 py-0.5 rounded">Danger</span>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500">{new Date(d.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 mb-2">{d.description}</p>
                <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3 h-3" /> {d.lat.toFixed(4)}, {d.lon.toFixed(4)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative p-4">
        <div className="h-full w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/5 relative">
          <MapContainer center={[27.85, 85.75]} zoom={10} className="h-full w-full">
            <TileLayer
              attribution='&copy; CARTO'
              url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
            />
            <MapClickHandler setDraftPoint={setDraftPoint} />
            
            {draftPoint && (
              <Marker position={draftPoint} icon={selectionIcon}>
                <Popup className="text-xs font-bold">New Hazard Location</Popup>
              </Marker>
            )}

            {disasters.map((d) => (
              <Marker key={d.id} position={[d.lat, d.lon]} icon={disasterIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong className="text-red-600 block mb-1 uppercase text-[10px] tracking-widest">Active Hazard</strong>
                    {d.description}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default DisasterReporter;
