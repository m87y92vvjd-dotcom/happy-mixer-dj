# Happy Mixer DJ

Happy Mixer DJ is an offline-first desktop DJ application for macOS and Windows. It runs locally without any web dependency, loads local audio files, and gives a four-deck, club-style interface for quick mixing and performance.

## Features

- Four independent deck controls
- Local file library loading from the filesystem
- Play / pause / seek / cue point control
- Pitch adjustment and volume mixing
- Master volume and crossfader
- Sync toggle for quick deck alignment
- Native desktop packaging via Tauri
- No internet access required once installed

## Requirements

- Node.js 20+
- npm
- Rust + Cargo
- On macOS: Xcode Command Line Tools
- On Windows: Rust toolchain and NSIS for installer builds

## Install dependencies

```bash
npm install
```

## Run in development mode

```bash
npm run tauri dev
```

## Build desktop app

```bash
npm run tauri build
```

This creates a native application bundle. On macOS it can generate a `.dmg`; on Windows it can generate an installer package depending on the target environment.

## Offline usage

The app uses local audio files only. It does not require any browser or internet service to play music.
