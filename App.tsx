
import React, { useState, useEffect } from 'react';
import { SessionRole } from './types';
import BroadcasterView from './components/BroadcasterView';
import ClientView from './components/ClientView';

const App: React.FC = () => {
  const [role, setRole] = useState<SessionRole | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const parts = hash.split('/');
      
      if (parts[0] === '#broadcast') {
        setRole(SessionRole.BROADCASTER);
        setRoomId(parts[1] || null);
      } else if (parts[0] === '#client') {
        setRole(SessionRole.CLIENT);
        setRoomId(parts[1] || null);
      } else {
        setRole(null);
        setRoomId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="space-y-4 max-w-md">
          <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-purple-500/20 mb-6">
            <i className="fas fa-tower-broadcast text-4xl text-white"></i>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">SyncStream</h1>
          <p className="text-lg text-slate-300">
            Broadcasting media to multiple devices with high-precision synchronization via WebRTC.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          <button
            onClick={() => (window.location.hash = 'broadcast')}
            className="group relative flex flex-col items-center p-8 bg-white/10 hover:bg-white/20 border border-white/10 rounded-3xl transition-all duration-300"
          >
            <div className="mb-4 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500 group-hover:scale-110 transition-all">
              <i className="fas fa-microphone text-purple-400 group-hover:text-white transition-colors"></i>
            </div>
            <span className="text-xl font-bold text-white">Broadcaster</span>
            <span className="text-sm text-slate-400 mt-2">Start a new room and control playback for everyone.</span>
          </button>

          <button
            onClick={() => (window.location.hash = 'client')}
            className="group relative flex flex-col items-center p-8 bg-white/10 hover:bg-white/20 border border-white/10 rounded-3xl transition-all duration-300"
          >
            <div className="mb-4 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500 group-hover:scale-110 transition-all">
              <i className="fas fa-headphones text-blue-400 group-hover:text-white transition-colors"></i>
            </div>
            <span className="text-xl font-bold text-white">Client</span>
            <span className="text-sm text-slate-400 mt-2">Join an existing stream and listen in perfect sync.</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-12 uppercase tracking-widest font-semibold">
          WebRTC Powered • Cross-Device • Low Latency
        </p>
      </div>
    );
  }

  return role === SessionRole.BROADCASTER ? <BroadcasterView /> : <ClientView roomId={roomId} />;
};

export default App;
