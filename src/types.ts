export type DeckId = 'A' | 'B' | 'C' | 'D';

export interface DeckState {
  id: DeckId;
  title: string;
  fileName: string;
  duration: number;
  position: number;
  playing: boolean;
  volume: number;
  pitch: number;
  cue: number;
}

export interface LibraryTrack {
  id: string;
  name: string;
  file: File;
  objectUrl: string;
}
