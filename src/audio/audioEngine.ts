import type { DeckId } from '../types';
import { calculateDeckGain, playbackRateFromPitch } from './mixerMath';

export interface DeckAudioState {
  element: HTMLAudioElement;
  objectUrl: string;
  fileId: string;
}

export class AudioEngine {
  private readonly decks = new Map<DeckId, DeckAudioState>();

  load(id: DeckId, element: HTMLAudioElement, file: File): string {
    const existing = this.decks.get(id);
    if (existing) {
      existing.element.pause();
      existing.element.removeAttribute('src');
      existing.element.load();
      URL.revokeObjectURL(existing.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    element.pause();
    element.src = objectUrl;
    element.load();

    this.decks.set(id, {
      element,
      objectUrl,
      fileId: `${file.name}:${file.size}:${file.lastModified}`,
    });

    return objectUrl;
  }

  unload(id: DeckId): void {
    const deck = this.decks.get(id);
    if (!deck) return;
    deck.element.pause();
    deck.element.removeAttribute('src');
    deck.element.load();
    URL.revokeObjectURL(deck.objectUrl);
    this.decks.delete(id);
  }

  async play(id: DeckId): Promise<void> {
    const deck = this.requireDeck(id);
    await deck.element.play();
  }

  pause(id: DeckId): void {
    this.requireDeck(id).element.pause();
  }

  stop(id: DeckId): void {
    const audio = this.requireDeck(id).element;
    audio.pause();
    audio.currentTime = 0;
  }

  setGain(id: DeckId, deckVolume: number, masterVolume: number, crossfader: number): void {
    const deck = this.decks.get(id);
    if (!deck) return;
    deck.element.volume = calculateDeckGain(id, deckVolume, masterVolume, crossfader);
  }

  setPitch(id: DeckId, pitch: number): void {
    const deck = this.decks.get(id);
    if (!deck) return;
    deck.element.playbackRate = playbackRateFromPitch(pitch);
  }

  get(id: DeckId): HTMLAudioElement | undefined {
    return this.decks.get(id)?.element;
  }

  dispose(): void {
    for (const id of this.decks.keys()) {
      this.unload(id);
    }
  }

  private requireDeck(id: DeckId): DeckAudioState {
    const deck = this.decks.get(id);
    if (!deck) {
      throw new Error(`Deck ${id} has no loaded audio`);
    }
    return deck;
  }
}
