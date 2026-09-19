import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DeckId, DeckState, LibraryTrack } from './types';

const DECK_IDS: DeckId[] = ['A', 'B', 'C', 'D'];
const EMPTY_TRACK = 'No track loaded';

const createDeck = (id: DeckId): DeckState => ({
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
});

const initialDecks: Record<DeckId, DeckState> = Object.fromEntries(
  DECK_IDS.map((id) => [id, createDeck(id)]),
) as Record<DeckId, DeckState>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, '0')}`;
}

function getFileId(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function App() {
  const audioRefs = useRef<Record<DeckId, HTMLAudioElement | null>>({ A: null, B: null, C: null, D: null });
  const urlsRef = useRef<Record<DeckId, string | null>>({ A: null, B: null, C: null, D: null });
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

  const effectiveVolume = useCallback((id: DeckId, volume: number) => {
    const side = id === 'A' || id === 'C' ? 1 - crossfader : crossfader;
    return clamp(volume * masterVolume * side, 0, 1);
  }, [crossfader, masterVolume]);

  const applyGain = useCallback((id: DeckId, volume = decksRef.current[id].volume) => {
    const audio = audioRefs.current[id];
    if (audio) audio.volume = effectiveVolume(id, volume);
  }, [effectiveVolume]);

  useEffect(() => {
    DECK_IDS.forEach((id) => applyGain(id));
  }, [applyGain]);

  // One stable timer updates visual state without recreating an interval on every frame.
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
      if (event.target instanceof HTMLInputElement) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < DECK_IDS.length) void togglePlay(DECK_IDS[index]);
      if (event.code === 'Space') {
        event.preventDefault();
        void togglePlay('A');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => () => {
    DECK_IDS.forEach((id) => {
      const url = urlsRef.current[id];
      if (url) URL.revokeObjectURL(url);
    });
    library.forEach((track) => URL.revokeObjectURL(track.objectUrl));
  }, [library]);

  const handleFile = (id: DeckId, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please choose a supported audio file.');
      return;
    }
    setError('');
    const oldUrl = urlsRef.current[id];
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const objectUrl = URL.createObjectURL(file);
    urlsRef.current[id] = objectUrl;
    const existing = library.find((track) => track.id === getFileId(file));
    const track = existing ?? { id: getFileId(file), name: file.name, file, objectUrl };
    setLibrary((items) => items.some((item) => item.id === track.id) ? items : [...items, track]);
    const audio = audioRefs.current[id];
    if (audio) {
      audio.pause();
      audio.src = objectUrl;
      audio.load();
      audio.playbackRate = 1;
    }
    updateDeck(id, { fileName: file.name, duration: 0, position: 0, playing: false, cue: 0, pitch: 1 });
  };

  const togglePlay = async (id: DeckId) => {
    const audio = audioRefs.current[id];
    if (!audio?.src) {
      setError(`Load a track on Deck ${id} first.`);
      return;
    }
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
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

  const setCue = (id: DeckId) => {
    const audio = audioRefs.current[id];
    if (audio) updateDeck(id, { cue: audio.currentTime });
  };

  const cueJump = async (id: DeckId) => {
    const audio = audioRefs.current[id];
    if (!audio?.src) return;
    audio.currentTime = decksRef.current[id].cue;
    try { await audio.play(); } catch { setError('Press Play to start this deck.'); }
  };

  const stop = (id: DeckId) => {
    const audio = audioRefs.current[id];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    updateDeck(id, { playing: false, position: 0 });
  };

  const activeDeckCount = useMemo(() => Object.values(decks).filter((d) => d.fileName !== EMPTY_TRACK).length, [decks]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><div className="brand">Happy Mixer DJ</div><div className="subtitle">Offline performance deck · Space = Deck A · 1–4 = play</div></div>
        <div className="stats-boxes"><div className="stat-box"><span>Library</span><strong>{library.length}</strong></div><div className="stat-box"><span>Decks</span><strong>{activeDeckCount}/4</strong></div><div className="stat-box"><span>Sync</span><strong>{syncOn ? 'ON' : 'OFF'}</strong></div></div>
      </header>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      <section className="mixer-panel">
        <div className="mixer-header"><div><span className="tiny-label">Master</span><strong>Output</strong></div><button className="sync-button" onClick={() => setSyncOn((value) => !value)}>{syncOn ? 'Sync Off' : 'Sync On'}</button></div>
        <label className="slider-block"><span>Master volume</span><input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(e) => setMasterVolume(Number(e.target.value))} /></label>
        <label className="slider-block"><span>Crossfader</span><input type="range" min="0" max="1" step="0.01" value={crossfader} onChange={(e) => setCrossfader(Number(e.target.value))} /></label>
      </section>
      <main className="deck-grid">
        {DECK_IDS.map((id) => {
          const deck = decks[id];
          const progress = deck.duration > 0 ? clamp(deck.position / deck.duration, 0, 1) * 100 : 0;
          return <article className="deck" key={id}>
            <div className="deck-header"><div><div className="deck-label">{deck.title}</div><div className="file-name">{deck.fileName}</div></div><div className={`status-pill ${deck.playing ? 'live' : ''}`}>{deck.playing ? 'LIVE' : 'READY'}</div></div>
            <div className="transport-row"><button className="primary" onClick={() => void togglePlay(id)}>{deck.playing ? 'Pause' : 'Play'}</button><button onClick={() => setCue(id)}>Set Cue</button><button onClick={() => void cueJump(id)}>Cue Jump</button><button onClick={() => stop(id)}>Stop</button></div>
            <div className="progress-wrap"><input aria-label={`Deck ${id} position`} type="range" min="0" max="100" value={progress} onChange={(e) => seek(id, Number(e.target.value) / 100)} /><div className="time-row"><span>{formatTime(deck.position)}</span><span>{formatTime(deck.duration)}</span></div></div>
            <div className="deck-controls"><label><span>Volume</span><input type="range" min="0" max="1" step="0.01" value={deck.volume} onChange={(e) => { const value = Number(e.target.value); updateDeck(id, { volume: value }); applyGain(id, value); }} /></label><label><span>Pitch {deck.pitch.toFixed(2)}x</span><input type="range" min="0.85" max="1.15" step="0.01" value={deck.pitch} disabled={syncOn} onChange={(e) => { const pitch = Number(e.target.value); const audio = audioRefs.current[id]; if (audio) audio.playbackRate = pitch; updateDeck(id, { pitch }); }} /></label></div>
            <div className="meta-row"><span>Cue: {formatTime(deck.cue)}</span><span>BPM: {deck.bpm || '--'}</span></div>
            <label className="file-picker"><span>Load track</span><input type="file" accept="audio/*" onChange={(e) => handleFile(id, e)} /></label>
            <audio ref={(node) => { audioRefs.current[id] = node; }} preload="metadata" onLoadedMetadata={() => { const audio = audioRefs.current[id]; if (audio) updateDeck(id, { duration: audio.duration }); }} onPlay={() => updateDeck(id, { playing: true })} onPause={() => updateDeck(id, { playing: false, position: audioRefs.current[id]?.currentTime ?? 0 })} onEnded={() => updateDeck(id, { playing: false, position: decksRef.current[id].duration })} onError={() => setError(`Unable to decode the audio file on Deck ${id}.`)} />
          </article>;
        })}
      </main>
    </div>
  );
}
