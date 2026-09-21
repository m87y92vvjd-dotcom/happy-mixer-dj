import { createWaveform, estimateTempo } from './audio/analysis';
import { AudioEngine } from './audio/audioEngine';
import { alignPositionToBeat, calculateDeckGain, playbackRateFromPitch } from './audio/mixerMath';

export type DeckId = 'A' | 'B' | 'C' | 'D';

export interface HotCue {
  id: string;
  position: number;
  color: string;
  label: string;
}

export interface LoopState {
  enabled: boolean;
  start: number;
  end: number;
  beats: number;
}

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
  bpm: number;
  bpmConfidence: number;
  waveform: number[];
  hotCues: HotCue[];
  loop: LoopState;
}

export interface LibraryTrack {
  id: string;
  name: string;
  file: File;
  objectUrl: string;
  duration: number;
  bpm: number;
  bpmConfidence: number;
}

export { AudioEngine, createWaveform, estimateTempo, calculateDeckGain, playbackRateFromPitch, alignPositionToBeat };
