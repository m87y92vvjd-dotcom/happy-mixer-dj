import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { DeckId, DeckState, LibraryTrack } from './types';

const deckIds: DeckId[] = ['A', 'B', 'C', 'D'];

const initialDecks: Record<DeckId, DeckState> = {
  A: { id: 'A', title: 'Deck A', fileName: 'No track loaded', duration: 0, position: 0, playing: false, volume: 0.8, pitch: 1, cue: 0 },
  B: { id: 'B', title: 'Deck B', fileName: 'No track loaded', duration: 0, position: 0, playing: false, volume: 0.8, pitch: 1, cue: 0 },
  C: { id: 'C', title: 'Deck C', fileName: 'No track loaded', duration: 0, position: 0, playing: false, volume: 0.8, pitch: 1, cue: 0 },
  D: { id: 'D', title: 'Deck D', fileName: 'No track loaded', duration: 0, position: 0, playing: false, volume: 0.8, pitch: 1, cue: 0 },
};

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '0:00';
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function App() {
  const audioRefs = useRef<Record<DeckId, HTMLAudioElement | null>>({
    A: null,
    B: null,
    C: null,
    D: null,
  });

  const [library, setLibrary] = useState<LibraryTrack[]>([]);
  const [decks, setDecks] = useState<Record<DeckId, DeckState>>(initialDecks);
  const [crossfader, setCrossfader] = useState(0.5);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [syncOn, setSyncOn] = useState(false);

  const activeDeckCount = useMemo(
    () => Object.values(decks).filter((deck) => deck.fileName !== 'No track loaded').length,
    [decks],
  );

  const updateDeck = (deckId: DeckId, next: Partial<DeckState>): void => {
    setDecks((prev) => ({ ...prev, [deckId]: { ...prev[deckId], ...next } }));
  };

  const applyDeckGain = (deckId: DeckId): void => {
    const audio = audioRefs.current[deckId];
    if (!audio) return;

    const deck = decks[deckId];
    const sideGain = deckId === 'A' || deckId === 'C' ? 1 - crossfader : crossfader;
    const effectiveVolume = deck.volume * masterVolume * sideGain;
    audio.volume = clamp(effectiveVolume, 0, 1);
  };

  useEffect(() => {
    deckIds.forEach(applyDeckGain);
  }, [crossfader, masterVolume, decks]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      deckIds.forEach((deckId) => {
        const audio = audioRefs.current[deckId];
        if (!audio || !decks[deckId].playing) return;

        updateDeck(deckId, {
          position: audio.currentTime,
          duration: Number.isFinite(audio.duration) ? audio.duration : decks[deckId].duration,
        });
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [decks]);

  const handleDeckFile = (deckId: DeckId, event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const track: LibraryTrack = {
      id: `${deckId}-${crypto.randomUUID()}`,
      name: file.name,
      file,
      objectUrl,
    };

    setLibrary((prev) => {
      const existing = prev.filter((item) => item.name !== file.name || item.file.size !== file.size);
      return [...existing, track];
    });

    const audio = audioRefs.current[deckId];
    if (audio) {
      audio.src = objectUrl;
      audio.load();
      audio.volume = 0;
    }

    updateDeck(deckId, {
      fileName: file.name,
      duration: 0,
      position: 0,
      playing: false,
      pitch: 1,
      cue: 0,
    });

    event.target.value = '';
  };

  const handleLoadedMetadata = (deckId: DeckId) => {
    const audio = audioRefs.current[deckId];
    if (!audio) return;
    updateDeck(deckId, {
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      position: audio.currentTime,
    });
  };

  const togglePlay = async (deckId: DeckId): Promise<void> => {
    const audio = audioRefs.current[deckId];
    if (!audio || !audio.src) return;

    if (audio.paused) {
      try {
        await audio.play();
        updateDeck(deckId, { playing: true });
      } catch (error) {
        console.warn('Autoplay blocked:', error);
      }
    } else {
      audio.pause();
      updateDeck(deckId, { playing: false, position: audio.currentTime });
    }
  };

  const seekDeck = (deckId: DeckId, ratio: number): void => {
    const audio = audioRefs.current[deckId];
    if (!audio) return;
    const nextTime = clamp(ratio, 0, 1) * (audio.duration || 0);
    audio.currentTime = nextTime;
    updateDeck(deckId, { position: nextTime });
  };

  const setCue = (deckId: DeckId): void => {
    const audio = audioRefs.current[deckId];
    if (!audio) return;
    const cueTime = audio.currentTime;
    updateDeck(deckId, { cue: cueTime });
  };

  const jumpToCue = (deckId: DeckId): void => {
    const audio = audioRefs.current[deckId];
    if (!audio) return;
    audio.currentTime = decks[deckId].cue;
    updateDeck(deckId, { position: decks[deckId].cue });
    if (audio.paused) {
      void audio.play();
      updateDeck(deckId, { playing: true });
    }
  };

  const updatePitch = (deckId: DeckId, value: number): void => {
    const audio = audioRefs.current[deckId];
    const pitch = clamp(value, 0.7, 1.4);
    if (audio) audio.playbackRate = pitch;
    updateDeck(deckId, { pitch });
  };

  const updateVolume = (deckId: DeckId, value: number): void => {
    const next = clamp(value, 0, 1);
    const audio = audioRefs.current[deckId];
    if (audio) {
      const deck = decks[deckId];
      const sideGain = deckId === 'A' || deckId === 'C' ? 1 - crossfader : crossfader;
      audio.volume = clamp(next * masterVolume * sideGain, 0, 1);
    }
    updateDeck(deckId, { volume: next });
  };

  const setSyncAll = (): void => {
    setSyncOn((prev) => !prev);
    deckIds.forEach((deckId) => {
      const audio = audioRefs.current[deckId];
      if (!audio) return;
      if (syncOn) {
        audio.playbackRate = 1;
        updateDeck(deckId, { pitch: 1 });
      }
    });
  };

  const deckCards = deckIds.map((deckId) => {
    const deck = decks[deckId];
    const audio = audioRefs.current[deckId];
    const progress = deck.duration > 0 ? (deck.position / deck.duration) * 100 : 0;

    return (
      <div className="deck" key={deckId}>
        <div className="deck-header">
          <div>
            <div className="deck-label">{deck.title}</div>
            <div className="file-name">{deck.fileName}</div>
          </div>
          <div className={`status-pill ${deck.playing ? 'live' : ''}`}>{deck.playing ? 'LIVE' : 'READY'}</div>
        </div>

        <div className="transport-row">
          <button className="primary" onClick={() => void togglePlay(deckId)}>
            {deck.playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => setCue(deckId)}>Set Cue</button>
          <button onClick={() => jumpToCue(deckId)}>Cue Jump</button>
        </div>

        <div className="progress-wrap">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(event) => seekDeck(deckId, Number(event.target.value) / 100)}
          />
          <div className="time-row">
            <span>{formatTime(deck.position)}</span>
            <span>{formatTime(deck.duration)}</span>
          </div>
        </div>

        <div className="deck-controls">
          <label>
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={deck.volume}
              onChange={(event) => updateVolume(deckId, Number(event.target.value))}
            />
          </label>

          <label>
            <span>Pitch {deck.pitch.toFixed(2)}x</span>
            <input
              type="range"
              min={0.7}
              max={1.4}
              step={0.01}
              value={deck.pitch}
              onChange={(event) => updatePitch(deckId, Number(event.target.value))}
            />
          </label>
        </div>

        <div className="file-picker-row">
          <label className="file-picker">
            <span>Load track</span>
            <input type="file" accept="audio/*" onChange={(event) => handleDeckFile(deckId, event)} />
          </label>
        </div>

        <audio
          ref={(node) => {
            audioRefs.current[deckId] = node;
          }}
          onLoadedMetadata={() => handleLoadedMetadata(deckId)}
          onTimeUpdate={() => {
            const currentAudio = audioRefs.current[deckId];
            if (!currentAudio) return;
            updateDeck(deckId, { position: currentAudio.currentTime });
          }}
          onPause={() => updateDeck(deckId, { playing: false })}
          onPlay={() => updateDeck(deckId, { playing: true })}
          onEnded={() => updateDeck(deckId, { playing: false, position: deck.duration })}
          onCanPlay={() => applyDeckGain(deckId)}
        />
      </div>
    );
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">Happy Mixer DJ</div>
          <div className="subtitle">Offline desktop performance deck</div>
        </div>
        <div className="stats-boxes">
          <div className="stat-box">
            <span>Library</span>
            <strong>{library.length}</strong>
          </div>
          <div className="stat-box">
            <span>Decks</span>
            <strong>{activeDeckCount}</strong>
          </div>
          <div className="stat-box">
            <span>Sync</span>
            <strong>{syncOn ? 'ON' : 'OFF'}</strong>
          </div>
        </div>
      </header>

      <section className="mixer-panel">
        <div className="mixer-header">
          <div>
            <span className="tiny-label">Master</span>
            <strong>Output</strong>
          </div>
          <button className="sync-button" onClick={setSyncAll}>{syncOn ? 'Sync Off' : 'Sync On'}</button>
        </div>

        <label className="slider-block">
          <span>Master volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(event) => setMasterVolume(Number(event.target.value))}
          />
        </label>

        <label className="slider-block">
          <span>Crossfader</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={crossfader}
            onChange={(event) => setCrossfader(Number(event.target.value))}
          />
        </label>
      </section>

      <main className="deck-grid">{deckCards}</main>
    </div>
  );
}
