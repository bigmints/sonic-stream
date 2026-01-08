
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SAMPLE_TRACKS } from '../constants';
import { SyncState, Message } from '../types';
import { syncService } from '../services/SyncService';

interface ClientViewProps {
  roomId: string | null;
}

const ClientView: React.FC<ClientViewProps> = ({ roomId }) => {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [manualRoomId, setManualRoomId] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeTrack = SAMPLE_TRACKS.find(t => t.id === syncState?.trackId) || SAMPLE_TRACKS[0];

  // Robust function to apply the broadcaster's state to the client's audio element
  const applySync = useCallback((state: SyncState) => {
    if (!audioRef.current) return;
    
    // 1. Sync Track (if changed)
    const expectedTrack = SAMPLE_TRACKS.find(t => t.id === state.trackId);
    if (expectedTrack && audioRef.current.src !== expectedTrack.url) {
        setAudioError(null);
        audioRef.current.src = expectedTrack.url;
        audioRef.current.load();
    }

    // 2. Sync Play/Pause
    if (state.isPlaying && hasInteracted) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(console.warn);
      }
    } else {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
    }

    // 3. Sync Progression (Exact Snap)
    const drift = Math.abs(audioRef.current.currentTime - state.currentTime);
    // Tight 150ms window. Also snap if the state is playing but we're paused.
    if (drift > 0.15 || (state.isPlaying && audioRef.current.paused)) {
      audioRef.current.currentTime = state.currentTime;
    }

    // Update state to reflect in UI
    setSyncState(state);
  }, [hasInteracted]);

  // Direct command handler for real-time mirroring of scrubbing/panning
  const handleMessage = useCallback((msg: Message) => {
    if (!audioRef.current) return;
    setStatus('CONNECTED');

    switch (msg.type) {
        case 'SYNC_UPDATE':
            applySync(msg.payload);
            break;
        case 'SEEK':
            // Direct mirroring of the broadcaster's scrubbing
            audioRef.current.currentTime = msg.payload.currentTime;
            setSyncState(prev => prev ? { ...prev, currentTime: msg.payload.currentTime } : null);
            break;
        case 'PLAY_STATE_CHANGE':
            if (msg.payload.isPlaying && hasInteracted) {
                audioRef.current.play().catch(console.warn);
            } else {
                audioRef.current.pause();
            }
            break;
        case 'TRACK_CHANGE':
            const track = SAMPLE_TRACKS.find(t => t.id === msg.payload.trackId);
            if (track) {
                audioRef.current.src = track.url;
                audioRef.current.load();
                if (msg.payload.isPlaying && hasInteracted) {
                    audioRef.current.play().catch(console.warn);
                }
            }
            break;
    }
  }, [applySync, hasInteracted]);

  // Connection Management
  useEffect(() => {
    if (!roomId) return;
    
    setStatus('CONNECTING');
    syncService.init().then(() => {
        syncService.connectTo(roomId);
    }).catch(() => setStatus('ERROR'));

    syncService.onMessage(handleMessage);

    return () => syncService.cleanup();
  }, [roomId, handleMessage]);

  // Audio "Unlock" Interaction
  const startListening = async () => {
    if (!audioRef.current) return;
    setHasInteracted(true);
    
    try {
        await audioRef.current.play();
        // If broadcaster is actually paused, pause immediately after unlocking
        if (syncState && !syncState.isPlaying) {
            audioRef.current.pause();
        }
    } catch (e) {
        console.error("Audio gesture unlock failed", e);
    }
  };

  const joinManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualRoomId.trim()) {
        window.location.hash = `client/${manualRoomId.trim().toLowerCase()}`;
    }
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center space-y-12">
        <div className="w-24 h-24 bg-blue-500/20 rounded-[2.5rem] flex items-center justify-center border border-blue-500/30">
            <i className="fas fa-tower-broadcast text-4xl text-blue-400"></i>
        </div>
        <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight">Receiver</h1>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">Enter a Broadcast ID to listen in perfect synchronization.</p>
        </div>
        <form onSubmit={joinManual} className="w-full max-w-xs space-y-4">
            <input 
              type="text" placeholder="BROADCAST ID" value={manualRoomId}
              onChange={(e) => setManualRoomId(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 p-5 rounded-2xl text-center focus:ring-2 focus:ring-blue-500 outline-none font-black tracking-widest uppercase text-sm"
            />
            <button className="w-full bg-blue-600 font-black py-5 rounded-2xl shadow-xl shadow-blue-900/20 active:scale-95 transition-all text-sm tracking-widest">CONNECT</button>
        </form>
        <button onClick={() => window.location.hash = ''} className="text-slate-500 text-xs font-black uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
       <header className="p-4 border-b border-white/5 flex justify-between items-center glass-panel z-20">
        <div className="flex items-center space-x-3">
          <button onClick={() => window.location.hash = ''} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-slate-400">
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="font-bold text-lg tracking-tight uppercase">Receiver</span>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border ${status === 'CONNECTED' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
           <span className={`w-1.5 h-1.5 rounded-full ${status === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-bounce'}`}></span>
           <span className="text-[10px] font-black uppercase tracking-widest">{status === 'CONNECTED' ? 'Synced' : 'Connecting'}</span>
        </div>
      </header>

      {!hasInteracted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10 animate-in fade-in zoom-in duration-500">
          <div className="relative w-36 h-36 bg-blue-600 rounded-[3rem] flex items-center justify-center shadow-2xl">
            <div className="absolute inset-0 bg-blue-600 blur-[80px] opacity-20 animate-pulse"></div>
            <i className="fas fa-play text-6xl ml-2 text-white"></i>
          </div>
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-black tracking-tighter">Remote Link Established</h2>
            <p className="text-slate-400 max-w-xs text-sm leading-relaxed">Tap below to lock your device to the broadcaster's progression.</p>
          </div>
          <button onClick={startListening} className="w-full max-w-xs bg-white text-slate-900 font-black py-6 rounded-3xl shadow-xl text-lg tracking-tight active:scale-95 transition-all">START LISTENING</button>
        </div>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full space-y-12">
          <div className="relative w-72 h-72 rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl">
            <img src={activeTrack.cover} className={`w-full h-full object-cover transition-transform duration-[8000ms] ${syncState?.isPlaying ? 'scale-125' : 'scale-100'}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
            {audioError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
                <i className="fas fa-signal-perfect text-yellow-500 text-4xl mb-4"></i>
                <p className="text-sm font-bold uppercase tracking-widest">{audioError}</p>
                <button onClick={() => { setAudioError(null); audioRef.current?.load(); }} className="mt-6 px-6 py-2.5 bg-white text-black rounded-xl text-[11px] font-black uppercase">Reconnect</button>
              </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3 px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20 inline-block">Direct Live Stream</span>
            <h2 className="text-4xl font-black tracking-tight truncate max-w-xs leading-none">{activeTrack.title}</h2>
            <p className="text-slate-400 font-bold text-xl">{activeTrack.artist}</p>
          </div>

          <div className="w-full space-y-8">
             {/* Dynamic Visualizer Bar */}
             <div className="flex justify-center items-end space-x-1.5 h-16">
               {[...Array(24)].map((_, i) => (
                 <div key={i} className={`w-1.5 bg-blue-500 rounded-full transition-all duration-300 ${syncState?.isPlaying ? 'opacity-100' : 'opacity-20 h-2'}`}
                   style={{ height: syncState?.isPlaying ? `${Math.random() * 50 + 10}px` : '4px' }}
                 ></div>
               ))}
             </div>

             <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center space-y-3 shadow-inner">
                <div className="flex items-center space-x-3">
                   <i className="fas fa-lock text-blue-500 text-[10px]"></i>
                   <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Master Progression Locked</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300 ease-linear" style={{ width: syncState ? `${(syncState.currentTime / (audioRef.current?.duration || 1)) * 100}%` : '0%' }}></div>
                </div>
             </div>
          </div>
        </main>
      )}

      <audio
        ref={audioRef}
        src={activeTrack.url}
        onError={() => setAudioError("Connection to source lost.")}
      />
    </div>
  );
};

export default ClientView;
