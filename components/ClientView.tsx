
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SAMPLE_TRACKS } from '../constants';
import { SyncState, Message } from '../types';
import { syncService } from '../services/SyncService';

const ClientView: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const track = SAMPLE_TRACKS.find(t => t.id === syncState?.trackId) || SAMPLE_TRACKS[0];

  const handleSync = useCallback((state: SyncState) => {
    if (!audioRef.current) return;

    // Calculate latency compensated time
    const latency = (Date.now() - state.serverTimestamp) / 1000;
    const targetTime = state.isPlaying ? state.currentTime + latency : state.currentTime;

    // Drift correction: only adjust if drift is significant (> 200ms) to avoid stuttering
    const currentAudioTime = audioRef.current.currentTime;
    const drift = Math.abs(currentAudioTime - targetTime);

    // Ensure correct track is loaded
    if (syncState?.trackId !== state.trackId) {
        setSyncState(state);
    } else {
        // Just update play state and time if needed
        setSyncState(state);
    }

    if (audioRef.current.src !== SAMPLE_TRACKS.find(t => t.id === state.trackId)?.url) {
        audioRef.current.src = SAMPLE_TRACKS.find(t => t.id === state.trackId)?.url || '';
        audioRef.current.load();
    }

    if (state.isPlaying) {
      if (audioRef.current.paused && hasInteracted) {
        audioRef.current.play().catch(e => console.error("Sync play failed", e));
      }
      
      // If we are more than 250ms out of sync, snap to target
      if (drift > 0.25 || audioRef.current.paused) {
        audioRef.current.currentTime = targetTime;
      }
    } else {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
      audioRef.current.currentTime = state.currentTime;
    }
  }, [hasInteracted, syncState?.trackId]);

  useEffect(() => {
    // Initial fetch of state if available
    const persisted = syncService.getPersistedState();
    if (persisted) {
      setSyncState(persisted);
    }

    syncService.onMessage((msg: Message) => {
      if (msg.type === 'SYNC_UPDATE') {
        handleSync(msg.payload as SyncState);
      }
    });

    return () => syncService.cleanup();
  }, [handleSync]);

  const startListening = () => {
    setHasInteracted(true);
    if (audioRef.current && syncState?.isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
       {/* Header */}
       <header className="p-4 border-b border-white/10 flex justify-between items-center glass-panel">
        <div className="flex items-center space-x-2">
          <button onClick={() => window.location.hash = ''} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="font-bold text-lg">Listener Mode</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
           <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
           <span className="text-xs font-bold text-green-400 uppercase tracking-tighter">Live Sync</span>
        </div>
      </header>

      {!hasInteracted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-blue-900/40">
            <i className="fas fa-play text-4xl ml-1"></i>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Ready to sync?</h2>
            <p className="text-slate-400">Click below to start listening in perfect harmony with the broadcaster.</p>
          </div>
          <button 
            onClick={startListening}
            className="w-full max-w-xs bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-colors shadow-lg"
          >
            Join Broadcast
          </button>
        </div>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full space-y-10">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-white/5 shadow-2xl">
            <img 
              src={track.cover} 
              alt={track.title} 
              className={`w-full h-full object-cover transition-all duration-1000 ${syncState?.isPlaying ? 'scale-110 rotate-[360deg]' : 'scale-100'}`}
              style={{ transitionDuration: syncState?.isPlaying ? '20s' : '0.5s', transitionTimingFunction: 'linear' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-slate-900/80 backdrop-blur rounded-full flex items-center justify-center">
                <i className={`fas ${syncState?.isPlaying ? 'fa-headphones' : 'fa-pause'} text-white`}></i>
              </div>
            </div>
          </div>

          <div className="text-center space-y-3">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Currently Playing</span>
              <h2 className="text-3xl font-bold truncate px-4">{track.title}</h2>
            </div>
            <p className="text-blue-400 font-semibold text-lg">{track.artist}</p>
          </div>

          <div className="w-full space-y-4">
             <div className="flex justify-center items-center space-x-1 h-8">
               {[...Array(8)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-1.5 bg-blue-500 rounded-full transition-all duration-200 ${syncState?.isPlaying ? 'opacity-100' : 'opacity-20 h-2'}`}
                   style={{ height: syncState?.isPlaying ? `${Math.random() * 24 + 8}px` : '4px' }}
                 ></div>
               ))}
             </div>
             <p className="text-center text-xs text-slate-500 font-medium">Listening to Broadcaster's feed</p>
          </div>
          
          <div className="w-full pt-8 flex justify-center">
             <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs text-slate-400 italic">
                <i className="fas fa-lock text-[10px]"></i>
                <span>Playback controls are locked by broadcaster</span>
             </div>
          </div>
        </main>
      )}

      {/* Hidden Audio Engine */}
      <audio
        ref={audioRef}
        src={track.url}
      />
    </div>
  );
};

export default ClientView;
