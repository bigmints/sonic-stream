
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SAMPLE_TRACKS, SYNC_INTERVAL_MS } from '../constants';
import { Track, SyncState } from '../types';
import { syncService } from '../services/SyncService';
import QRShare from './QRShare';

const BroadcasterView: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showShare, setShowShare] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const track = SAMPLE_TRACKS[currentTrackIndex];

  // Broadcast state updates
  const broadcastCurrentState = useCallback(() => {
    if (!audioRef.current) return;
    
    const state: SyncState = {
      trackId: track.id,
      isPlaying: !audioRef.current.paused,
      currentTime: audioRef.current.currentTime,
      serverTimestamp: Date.now(),
      volume: audioRef.current.volume
    };
    syncService.broadcastState(state);
  }, [track.id]);

  // Handle Sync Interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        broadcastCurrentState();
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, broadcastCurrentState]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(e => console.error("Play failed", e));
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    broadcastCurrentState();
  };

  const skip = (direction: 'next' | 'prev') => {
    let nextIndex = currentTrackIndex;
    if (direction === 'next') {
      nextIndex = (currentTrackIndex + 1) % SAMPLE_TRACKS.length;
    } else {
      nextIndex = (currentTrackIndex - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length;
    }
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
    // State will be broadcasted once track loads and starts playing
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
      broadcastCurrentState();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-20 glass-panel">
        <div className="flex items-center space-x-2">
          <button onClick={() => window.location.hash = ''} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="font-bold text-lg">Broadcaster Mode</span>
        </div>
        <button 
          onClick={() => setShowShare(true)}
          className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-purple-900/40"
        >
          <i className="fas fa-share-nodes"></i>
          <span>Share</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 max-w-xl mx-auto w-full space-y-8 overflow-y-auto pb-32">
        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl group">
          <img 
            src={track.cover} 
            alt={track.title} 
            className={`w-full h-full object-cover transition-transform duration-1000 ${isPlaying ? 'scale-110' : 'scale-100'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
          {isPlaying && (
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-1">
                <div className="w-1.5 h-6 bg-purple-400 rounded-full animate-[bounce_0.6s_infinite]"></div>
                <div className="w-1.5 h-10 bg-purple-400 rounded-full animate-[bounce_0.8s_infinite]"></div>
                <div className="w-1.5 h-8 bg-purple-400 rounded-full animate-[bounce_0.7s_infinite]"></div>
                <div className="w-1.5 h-5 bg-purple-400 rounded-full animate-[bounce_0.9s_infinite]"></div>
             </div>
          )}
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{track.title}</h2>
          <p className="text-purple-400 font-medium">{track.artist}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-8">
          <button onClick={() => skip('prev')} className="text-2xl text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-backward-step"></i>
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center text-3xl shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} ml-${isPlaying ? '0' : '1'}`}></i>
          </button>
          
          <button onClick={() => skip('next')} className="text-2xl text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-forward-step"></i>
          </button>
        </div>

        {/* Status */}
        <div className="pt-8 border-t border-white/5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4 text-center">Connected Clients</h3>
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-400 italic">
             <p className="text-sm flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Broadcasting live...</span>
             </p>
          </div>
        </div>
      </main>

      {/* Audio Engine (Hidden) */}
      <audio
        ref={audioRef}
        src={track.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => skip('next')}
        autoPlay={isPlaying}
      />

      {/* Share Overlay */}
      {showShare && <QRShare onClose={() => setShowShare(false)} />}
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
