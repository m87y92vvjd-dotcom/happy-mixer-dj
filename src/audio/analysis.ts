export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

export interface TempoEstimate {
  bpm: number;
  confidence: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createWaveform(buffer: AudioBuffer, peakCount = 1600): WaveformData {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const safePeakCount = Math.max(64, Math.min(peakCount, frames));
  const framesPerPeak = Math.max(1, Math.floor(frames / safePeakCount));
  const peaks = new Array<number>(safePeakCount).fill(0);

  for (let bucket = 0; bucket < safePeakCount; bucket += 1) {
    const start = bucket * framesPerPeak;
    const end = Math.min(frames, start + framesPerPeak);
    if (start >= end) continue;

    let sum = 0;
    let samples = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let frame = start; frame < end; frame += 1) {
        const sample = data[frame] ?? 0;
        sum += sample * sample;
        samples += 1;
      }
    }

    peaks[bucket] = samples > 0 ? Math.sqrt(sum / samples) : 0;
  }

  const maximum = Math.max(...peaks, 0.000001);
  return {
    peaks: peaks.map((value) => clamp(value / maximum, 0, 1)),
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
  };
}

export function estimateTempo(buffer: AudioBuffer): TempoEstimate {
  const channel = buffer.getChannelData(0);
  const analysisRate = 200;
  const blockSize = Math.max(1, Math.floor(buffer.sampleRate / analysisRate));
  const envelope: number[] = [];

  for (let offset = 0; offset < channel.length; offset += blockSize) {
    const end = Math.min(channel.length, offset + blockSize);
    let energy = 0;

    for (let index = offset; index < end; index += 1) {
      const sample = channel[index] ?? 0;
      energy += sample * sample;
    }

    envelope.push(Math.sqrt(energy / Math.max(1, end - offset)));
  }

  if (envelope.length < analysisRate * 4) {
    return { bpm: 0, confidence: 0 };
  }

  const mean = envelope.reduce((sum, value) => sum + value, 0) / envelope.length;
  const variance = envelope.reduce((sum, value) => sum + (value - mean) ** 2, 0) / envelope.length;
  const deviation = Math.sqrt(variance);

  if (deviation < 0.00001) {
    return { bpm: 0, confidence: 0 };
  }

  const normalized = envelope.map((value) => Math.max(0, (value - mean) / deviation));
  const minBpm = 70;
  const maxBpm = 180;
  const minLag = Math.floor((60 * analysisRate) / maxBpm);
  const maxLag = Math.floor((60 * analysisRate) / minBpm);

  let bestLag = 0;
  let bestScore = -Infinity;
  let secondScore = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    let count = 0;

    for (let index = lag; index < normalized.length; index += 1) {
      score += normalized[index] * normalized[index - lag];
      count += 1;
    }

    const averageScore = count > 0 ? score / count : 0;

    if (averageScore > bestScore) {
      secondScore = bestScore;
      bestScore = averageScore;
      bestLag = lag;
    } else if (averageScore > secondScore) {
      secondScore = averageScore;
    }
  }

  if (bestLag <= 0 || bestScore <= 0) {
    return { bpm: 0, confidence: 0 };
  }

  const bpm = Math.round((60 * analysisRate) / bestLag);
  const separation = bestScore - Math.max(0, secondScore);
  const confidence = clamp(separation / Math.max(bestScore, 0.0001), 0, 1);

  return {
    bpm: bpm >= minBpm && bpm <= maxBpm ? bpm : 0,
    confidence,
  };
}
