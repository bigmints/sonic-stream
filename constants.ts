
import { Track } from './types';

export const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Midnight City Beats',
    artist: 'Lofi Girl',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    cover: 'https://picsum.photos/seed/music1/400/400'
  },
  {
    id: '2',
    title: 'Summer Breeze',
    artist: 'Chill Masters',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    cover: 'https://picsum.photos/seed/music2/400/400'
  },
  {
    id: '3',
    title: 'Neon Horizon',
    artist: 'SynthWave Pro',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    cover: 'https://picsum.photos/seed/music3/400/400'
  }
];

export const SYNC_CHANNEL_NAME = 'sync_stream_broadcast_v1';
export const SYNC_INTERVAL_MS = 1000;
