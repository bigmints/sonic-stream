
import { SyncState, Message, MessageType } from '../types';

declare const Peer: any;

class SyncService {
  private peer: any = null;
  private connections: any[] = [];
  private onMessageCallback: ((msg: Message, conn: any) => void) | null = null;
  private onConnectionChangeCallback: ((count: number) => void) | null = null;
  public peerId: string | null = null;

  public async init(): Promise<string> {
    if (this.peer) return this.peerId!;

    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on('open', (newId: string) => {
        this.peerId = newId;
        resolve(newId);
      });

      this.peer.on('connection', (conn: any) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        console.error('Peer error:', err);
        reject(err);
      });
    });
  }

  public connectTo(targetId: string) {
    if (!this.peer) return;
    const conn = this.peer.connect(targetId, { reliable: true });
    this.setupConnection(conn);
  }

  private setupConnection(conn: any) {
    conn.on('open', () => {
      if (!this.connections.find(c => c.peer === conn.peer)) {
        this.connections.push(conn);
        this.notifyConnectionChange();
      }
      // Notify the other side that we're ready
      conn.send({ type: 'COMMAND', payload: { action: 'REQUEST_INITIAL_SYNC' } });
    });

    conn.on('data', (data: any) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(data as Message, conn);
      }
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
      this.notifyConnectionChange();
    });

    conn.on('error', (err: any) => {
       console.error("Connection error:", err);
       this.connections = this.connections.filter(c => c !== conn);
       this.notifyConnectionChange();
    });
  }

  private notifyConnectionChange() {
    if (this.onConnectionChangeCallback) {
      this.onConnectionChangeCallback(this.connections.length);
    }
  }

  public broadcast(type: MessageType, payload: any) {
    const message: Message = { type, payload };
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  public broadcastState(state: SyncState) {
    this.broadcast('SYNC_UPDATE', {
      ...state,
      serverTimestamp: Date.now(),
    });
  }

  public sendTo(conn: any, message: Message) {
    if (conn.open) {
      conn.send(message);
    }
  }

  public onMessage(callback: (msg: Message, conn: any) => void) {
    this.onMessageCallback = callback;
  }

  public onConnectionChange(callback: (count: number) => void) {
    this.onConnectionChangeCallback = callback;
  }

  public cleanup() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections = [];
    this.peerId = null;
  }
}

export const syncService = new SyncService();
