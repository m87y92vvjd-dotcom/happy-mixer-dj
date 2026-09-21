export interface MixerLevels {
  left: number;
  right: number;
}

export function crossfaderGain(id: 'A' | 'B' | 'C' | 'D', crossfader: number): number {
  const value = Math.min(Math.max(crossfader, 0), 1);
  const leftDecks = id === 'A' || id === 'C';

  return leftDecks
    ? Math.cos(value * (Math.PI / 2))
    : Math.sin(value * (Math.PI / 2));
}

export function calculateDeckGain(
  id: 'A' | 'B' | 'C' | 'D',
  deckVolume: number,
  masterVolume: number,
  crossfader: number,
): number {
  const volume = Math.min(Math.max(deckVolume, 0), 1);
  const master = Math.min(Math.max(masterVolume, 0), 1);
  return Math.min(Math.max(volume * master * crossfaderGain(id, crossfader), 0), 1);
}

export function playbackRateFromPitch(pitch: number): number {
  return Math.min(Math.max(Number.isFinite(pitch) ? pitch : 1, 0.5), 1.5);
}

export function alignPositionToBeat(position: number, bpm: number, targetBpm: number): number {
  if (!Number.isFinite(position) || !Number.isFinite(bpm) || !Number.isFinite(targetBpm) || bpm <= 0 || targetBpm <= 0) {
    return Math.max(0, position);
  }
  const beatLength = 60 / targetBpm;
  const beatIndex = Math.round(position / beatLength);
  return Math.max(0, beatIndex * beatLength);
}

export function calculateStereoLevels(values: Partial<Record<'A' | 'B' | 'C' | 'D', number>>): MixerLevels {
  const left = Math.min(1, (values.A ?? 0) + (values.C ?? 0));
  const right = Math.min(1, (values.B ?? 0) + (values.D ?? 0));
  return { left, right };
}
