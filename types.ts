
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

export type MessageType = 'SYNC_UPDATE' | 'TRACK_CHANGE' | 'PLAY_STATE_CHANGE' | 'SEEK' | 'COMMAND';

export interface Message {
  type: MessageType;
  payload: any;
}
