import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createWaveform, estimateTempo } from './audio/analysis';
import { AudioEngine } from './audio/audioEngine';
import type { DeckId, DeckState, LibraryTrack } from './types';

const DECK_IDS: DeckId[] = ['A', 'B', 'C', 'D'];
const EMPTY_TRACK = 'No track loaded';

function createDeck(id: DeckId): DeckState {
  return {
    id,
    title: `Deck ${id}`,
    fileName: EMPTY_TRACK,
    duration: 0,
    position: 0,
    playing: false,
    volume: 0.8,
    pitch: 1,
    cue: 0,
    bpm: 0,
    bpmConfidence: 0,
    waveform: [],
    hotCues: [],
    loop: { enabled: false, start: 0, end: 0, beats: 4 },
  };
}

const initialDecks = Object.fromEntries(DECK_IDS.map((id) => [id, createDeck(id)])) as Record<DeckId, DeckState>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, '0')}`;
}

function fileId(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function App() {
  const audioRefs = useRef<Record<DeckId, HTMLAudioElement | null>>({ A: null, B: null, C: null, D: null });
  const engineRef = useRef(new AudioEngine());
  const decksRef = useRef(initialDecks);
  const [decks, setDecks] = useState(initialDecks);
  const [library, setLibrary] = useState<LibraryTrack[]>([]);
  const [crossfader, setCrossfader] = useState(0.5);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [syncOn, setSyncOn] = useState(false);
  const [error, setError] = useState('');

  const updateDeck = useCallback((id: DeckId, patch: Partial<DeckState>) => {
    setDecks((current) => {
      const next = { ...current, [id]: { ...current[id], ...patch } };
      decksRef.current = next;
      return next;
    });
  }, []);

  const applyGain = useCallback((id: DeckId, volume = decksRef.current[id].volume) => {
    engineRef.current.setGain(id, volume, masterVolume, crossfader);
  }, [crossfader, masterVolume]);

  useEffect(() => {
    DECK_IDS.forEach((id) => applyGain(id));
  }, [applyGain]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      DECK_IDS.forEach((id) => {
        const audio = audioRefs.current[id];
        if (audio && !audio.paused) updateDeck(id, { position: audio.currentTime, playing: true });
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [updateDeck]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < DECK_IDS.length) {
        event.preventDefault();
        void togglePlay(DECK_IDS[index]);
      } else if (event.code === 'Space') {
        event.preventDefault();
        void togglePlay('A');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => () => {
    engineRef.current.dispose();
    library.forEach((track) => URL.revokeObjectURL(track.objectUrl));
  }, [library]);

  const analyze = async (file: File) => {
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      return { waveform: createWaveform(buffer).peaks, tempo: estimateTempo(buffer) };
    } finally {
      await context.close();
    }
  };

  const handleFile = async (id: DeckId, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please choose a supported audio file.');
      return;
    }

    const audio = audioRefs.current[id];
    if (!audio) return;
    setError('');
    const trackId = fileId(file);
    const libraryUrl = URL.createObjectURL(file);
    setLibrary((items) => items.some((item) => item.id === trackId) ? items : [...items, {
      id: trackId, name: file.name, file, objectUrl: libraryUrl, duration: 0, bpm: 0, bpmConfidence: 0,
    }]);

    engineRef.current.load(id, audio, file);
    updateDeck(id, { fileName: file.name, duration: 0, position: 0, playing: false, cue: 0, pitch: 1, bpm: 0, bpmConfidence: 0, waveform: [] });
    applyGain(id);

    try {
      const result = await analyze(file);
      updateDeck(id, { waveform: result.waveform, bpm: result.tempo.bpm, bpmConfidence: result.tempo.confidence });
    } catch {
      setError('Track loaded, but audio analysis was unavailable for this file.');
    }
  };

  const setPlaying = (id: DeckId, playing: boolean) => {
    const audio = audioRefs.current[id];
    updateDeck(id, { playing, position: audio?.currentTime ?? decksRef.current[id].position });
  };

  const togglePlay = async (id: DeckId) => {
    const audio = audioRefs.current[id];
    if (!audio?.src) {
      setError(`Load a track on Deck ${id} first.`);
      return;
    }
    try {
      if (audio.paused) {
        await engineRef.current.play(id);
        setPlaying(id, true);
      } else {
        engineRef.current.pause(id);
        setPlaying(id, false);
      }
    } catch {
      setError('Playback was blocked. Press Play again after interacting with the window.');
    }
  };

  const seek = (id: DeckId, ratio: number) => {
    const audio = audioRefs.current[id];
    if (!audio) return;
    const position = clamp(ratio, 0, 1) * (Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.currentTime = position;
    updateDeck(id, { position });
  };

  const activeDeckCount = useMemo(() => Object.values(decks).filter((deck) => deck.fileName !== EMPTY_TRACK).length, [decks]);

  return <div className="app-shell">
    <header className="topbar">
      <div><div className="brand">Happy Mixer DJ</div><div className="subtitle">Original audio engine · Space = Deck A · 1–4 = play</div></div>
      <div className="stats-boxes"><div className="stat-box"><span>Library</span><strong>{library.length}</strong></div><div className="stat-box"><span>Decks</span><strong>{activeDeckCount}/4</strong></div></div>
    </header>
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    <section className="mixer-panel">
      <div className="mixer-header"><div><span className="tiny-label">Master</span><strong>Output</strong></div><button className="sync-button" onClick={() => setSyncOn((value) => !value)} type="button">{syncOn ? 'Sync On' : 'Sync Off'}</button></div>
      <label className="slider-block"><span>Master volume</span><input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(event) => setMasterVolume(Number(event.target.value))} /></label>
      <label className="slider-block"><span>Crossfader</span><input type="range" min="0" max="1" step="0.01" value={crossfader} onChange={(event) => setCrossfader(Number(event.target.value))} /></label>
    </section>
    <main className="deck-grid">{DECK_IDS.map((id) => {
      const deck = decks[id];
      const progress = deck.duration > 0 ? clamp(deck.position / deck.duration, 0, 1) * 100 : 0;
      return <article className="deck" key={id}>
        <div className="deck-header"><div><div className="deck-label">{deck.title}</div><div className="file-name">{deck.fileName}</div></div><div className={`status-pill ${deck.playing ? 'live' : ''}`}>{deck.playing ? 'LIVE' : 'READY'}</div></div>
        {deck.waveform.length > 0 && <div className="waveform" aria-label={`Deck ${id} waveform`}>{deck.waveform.map((peak, index) => <i key={index} style={{ height: `${Math.max(8, peak * 100)}%` }} />)}</div>}
        <div className="transport-row"><button className="primary" onClick={() => void togglePlay(id)} type="button">{deck.playing ? 'Pause' : 'Play'}</button><button onClick={() => updateDeck(id, { cue: audioRefs.current[id]?.currentTime ?? 0 })} type="button">Set Cue</button><button onClick={() => { const audio = audioRefs.current[id]; if (audio) audio.currentTime = deck.cue; }} type="button">Cue Jump</button><button onClick={() => { engineRef.current.stop(id); setPlaying(id, false); }} type="button">Stop</button></div>
        <div className="progress-wrap"><input aria-label={`Deck ${id} position`} type="range" min="0" max="100" value={progress} onChange={(event) => seek(id, Number(event.target.value) / 100)} /><div className="time-row"><span>{formatTime(deck.position)}</span><span>{formatTime(deck.duration)}</span></div></div>
        <div className="deck-controls"><label><span>Volume</span><input type="range" min="0" max="1" step="0.01" value={deck.volume} onChange={(event) => { const value = Number(event.target.value); updateDeck(id, { volume: value }); applyGain(id, value); }} /></label><label><span>Pitch</span><input type="range" min="0.5" max="1.5" step="0.01" value={deck.pitch} onChange={(event) => { const value = Number(event.target.value); updateDeck(id, { pitch: value }); engineRef.current.setPitch(id, value); }} /></label></div>
        <div className="meta-row"><span>Cue: {formatTime(deck.cue)}</span><span>BPM: {deck.bpm || '--'}{deck.bpmConfidence > 0 ? ` (${Math.round(deck.bpmConfidence * 100)}%)` : ''}</span></div>
        <label className="file-picker"><span>Load track</span><input type="file" accept="audio/*" onChange={(event) => void handleFile(id, event)} /></label>
        <audio ref={(node) => { audioRefs.current[id] = node; }} preload="metadata" onLoadedMetadata={() => { const audio = audioRefs.current[id]; if (audio) updateDeck(id, { duration: Number.isFinite(audio.duration) ? audio.duration : 0 }); }} onPlay={() => setPlaying(id, true)} onPause={() => setPlaying(id, false)} onEnded={() => { const audio = audioRefs.current[id]; if (audio) audio.currentTime = 0; setPlaying(id, false); }} />
      </article>;
    })}</main>
  </div>;
}
