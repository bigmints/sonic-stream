
export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover: string;
}

export enum SessionRole {
  BROADCASTER = 'broadcaster',
  CLIENT = 'client'
}

export interface SyncState {
  trackId: string;
  isPlaying: boolean;
  currentTime: number;
  serverTimestamp: number;
  volume: number;
}

export interface Message {
  type: 'SYNC_UPDATE' | 'COMMAND';
  payload: any;
}
