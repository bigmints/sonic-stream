
import { SyncState, Message } from '../types';
import { SYNC_CHANNEL_NAME } from '../constants';

class SyncService {
  private channel: BroadcastChannel;
  private onMessageCallback: ((msg: Message) => void) | null = null;

  constructor() {
    this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(event.data);
      }
    };
  }

  public broadcastState(state: SyncState) {
    const message: Message = {
      type: 'SYNC_UPDATE',
      payload: {
        ...state,
        serverTimestamp: Date.now(),
      }
    };
    this.channel.postMessage(message);
    
    // Also persist to localStorage for new clients joining late
    localStorage.setItem('sync_stream_current_state', JSON.stringify(message.payload));
  }

  public onMessage(callback: (msg: Message) => void) {
    this.onMessageCallback = callback;
  }

  public getPersistedState(): SyncState | null {
    const saved = localStorage.getItem('sync_stream_current_state');
    return saved ? JSON.parse(saved) : null;
  }

  public cleanup() {
    this.channel.close();
  }
}

export const syncService = new SyncService();
