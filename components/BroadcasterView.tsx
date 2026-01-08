
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SAMPLE_TRACKS, SYNC_INTERVAL_MS } from '../constants';
import { Track, SyncState, Message } from '../types';
import { syncService } from '../services/SyncService';
import QRShare from './QRShare';

const BroadcasterView: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isScrubbing = useRef(false);
  const track = SAMPLE_TRACKS[currentTrackIndex];

  // Helper to build the current state object for full synchronization
  const getFullState = useCallback((): SyncState => {
    return {
      trackId: track.id,
      isPlaying: !audioRef.current?.paused,
      currentTime: audioRef.current?.currentTime || 0,
      serverTimestamp: Date.now(),
      volume: audioRef.current?.volume || 1
    };
  }, [track.id]);

  // Main broadcast trigger for any state update
  const broadcastFullSync = useCallback((targetConn?: any) => {
    const state = getFullState();
    if (targetConn) {
      syncService.sendTo(targetConn, { type: 'SYNC_UPDATE', payload: state });
    } else {
      syncService.broadcastState(state);
    }
  }, [getFullState]);

  // Peer & Messaging Setup
  useEffect(() => {
    syncService.init().then(id => {
      setPeerId(id);
      if (!window.location.hash.includes('/')) {
        window.location.hash = `broadcast/${id}`;
      }
    });

    syncService.onConnectionChange(setListenerCount);

    syncService.onMessage((msg, conn) => {
      if (msg.type === 'COMMAND' && msg.payload.action === 'REQUEST_INITIAL_SYNC') {
        broadcastFullSync(conn);
      }
    });

    return () => syncService.cleanup();
  }, [broadcastFullSync]);

  // Periodic heartbeat sync to correct minor clock drifts
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused && !isScrubbing.current) {
        broadcastFullSync();
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [broadcastFullSync]);

  // Handle Track Changes (Next/Prev)
  useEffect(() => {
    if (audioRef.current) {
      setLoadError(null);
      audioRef.current.src = track.url;
      audioRef.current.load();
      // If we were playing, try to resume on the new track
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      // CRITICAL: Notify clients immediately when track changes
      broadcastFullSync();
    }
  }, [currentTrackIndex]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        setLoadError("Tap to allow audio playback");
      }
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    // CRITICAL: Notify clients immediately on play/pause
    broadcastFullSync();
  };

  const skip = (direction: 'next' | 'prev') => {
    let nextIndex = direction === 'next' 
      ? (currentTrackIndex + 1) % SAMPLE_TRACKS.length 
      : (currentTrackIndex - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length;
    setCurrentTrackIndex(nextIndex);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isScrubbing.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  // Scrubbing (Panning through time) logic
  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
      // "Panning" (Seeking) broadcast in real-time
      syncService.broadcast('SEEK', { currentTime: val });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="p-4 border-b border-white/5 flex justify-between items-center glass-panel sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button onClick={() => window.location.hash = ''} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-slate-400">
            <i className="fas fa-chevron-left"></i>
          </button>
          <div>
            <h1 className="font-black text-lg uppercase tracking-tight leading-none">Broadcaster</h1>
            <span className="text-[9px] text-purple-400 font-black uppercase tracking-widest">{peerId ? 'Broadcasting Now' : 'Connecting Peer...'}</span>
          </div>
        </div>
        <button onClick={() => setShowShare(true)} className="bg-purple-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 active:scale-95 transition-transform">Invite</button>
      </header>

      <main className="flex-1 flex flex-col p-6 max-w-xl mx-auto w-full space-y-8 pb-32">
        <div className="relative aspect-square w-full rounded-[4rem] overflow-hidden shadow-2xl border-4 border-white/5 group">
          <img src={track.cover} className={`w-full h-full object-cover transition-transform duration-[10000ms] ${isPlaying ? 'scale-125' : 'scale-100'}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
          
          {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-8 text-center animate-in fade-in">
                  <i className="fas fa-exclamation-circle text-4xl text-yellow-500 mb-4"></i>
                  <p className="font-bold text-white mb-6">{loadError}</p>
                  <button onClick={() => { setLoadError(null); audioRef.current?.load(); }} className="px-8 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest">Reload</button>
              </div>
          )}
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black tracking-tighter">{track.title}</h2>
          <p className="text-purple-400 font-bold text-lg">{track.artist}</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-400">Time Sync</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range" min="0" max={duration || 100} step="0.1" value={currentTime}
            onInput={handleSeekInput}
            onMouseDown={() => { isScrubbing.current = true; }}
            onMouseUp={() => { isScrubbing.current = false; broadcastFullSync(); }}
            onTouchStart={() => { isScrubbing.current = true; }}
            onTouchEnd={() => { isScrubbing.current = false; broadcastFullSync(); }}
            className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-purple-500 shadow-inner"
          />
        </div>

        <div className="flex items-center justify-evenly py-4">
          <button onClick={() => skip('prev')} className="w-16 h-16 rounded-full text-2xl text-slate-500 hover:text-white transition-all active:scale-90">
            <i className="fas fa-backward-step"></i>
          </button>
          <button onClick={togglePlay} className="w-24 h-24 bg-white text-slate-950 rounded-[3rem] flex items-center justify-center text-4xl shadow-2xl active:scale-95 transition-all">
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} ${isPlaying ? '' : 'ml-1'}`}></i>
          </button>
          <button onClick={() => skip('next')} className="w-16 h-16 rounded-full text-2xl text-slate-500 hover:text-white transition-all active:scale-90">
            <i className="fas fa-forward-step"></i>
          </button>
        </div>

        <div className="pt-8 border-t border-white/5 text-center flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 bg-purple-500/10 px-6 py-3 rounded-full border border-purple-500/20">
                <span className={`w-2 h-2 ${listenerCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-700'} rounded-full`}></span>
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{listenerCount} Device{listenerCount !== 1 ? 's' : ''} Listening</span>
            </div>
            {peerId && <p className="mt-4 text-[9px] font-mono text-slate-600 uppercase tracking-tight">Broadcast ID: {peerId}</p>}
        </div>
      </main>

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleTimeUpdate}
        onError={() => setLoadError("Source connection interrupted.")}
        onEnded={() => skip('next')}
      />
      {showShare && <QRShare onClose={() => setShowShare(false)} peerId={peerId || ''} />}
    </div>
  );
};

const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default BroadcasterView;
