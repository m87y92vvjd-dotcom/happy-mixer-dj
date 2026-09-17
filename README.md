# Happy Mixer DJ

Offline desktop DJ software for macOS and Windows with no web dependency. Built as a Tauri app with React for the interface and HTML5 audio for local playback.

## Features

- 4-deck local audio interface
- Offline music library loading from the local filesystem
- Play / pause / seek / cue points
- Pitch control and volume mixing
- Crossfader and master output control
- Sync toggle for quick deck alignment
- Native install packaging for Windows and macOS via Tauri

## Requirements

- Node.js 20+
- npm
- Rust + Cargo
- For macOS packaging: Xcode Command Line Tools
- For Windows packaging: Rust target and NSIS

## Install

```bash
npm install
```

## Run in development mode

```bash
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Notes

This app is intentionally offline-only. It uses local audio files and does not require internet access.
