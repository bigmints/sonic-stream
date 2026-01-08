
import React from 'react';

interface QRShareProps {
  onClose: () => void;
  peerId: string;
}

const QRShare: React.FC<QRShareProps> = ({ onClose, peerId }) => {
  const clientUrl = `${window.location.origin}${window.location.pathname}#client/${peerId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clientUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col items-center space-y-6 shadow-2xl animate-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="text-center space-y-2 pt-4">
          <h2 className="text-2xl font-bold">Invite Listeners</h2>
          <p className="text-slate-400 text-sm px-4">They'll hear exactly what you hear, in real-time.</p>
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-xl">
          <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
        </div>

        <div className="w-full space-y-3">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Broadcast ID</span>
            <div className="flex items-center space-x-2 bg-slate-800 p-4 rounded-2xl border border-white/5">
                <span className="flex-1 truncate text-xs text-slate-400 font-mono font-bold text-center tracking-tighter">{peerId}</span>
            </div>
          </div>
          
          <button 
            onClick={() => {
                navigator.clipboard.writeText(clientUrl);
                alert("Invite link copied to clipboard!");
            }}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center space-x-2"
          >
            <i className="fas fa-copy"></i>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRShare;
