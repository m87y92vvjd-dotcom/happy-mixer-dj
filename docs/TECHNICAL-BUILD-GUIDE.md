# Happy Mixer DJ — Technical Build and Distribution Guide

## Overview

Happy Mixer DJ is an offline-first Tauri desktop application with a React/TypeScript interface. It loads local audio files and does not require a web service after installation.

## Repository

`https://github.com/m87y92vvjd-dotcom/happy-mixer-dj`

## Architecture

- Frontend: React, TypeScript, Vite
- Desktop shell: Tauri 2
- Native project: Rust/Cargo under `src-tauri`
- Audio model: local HTML audio playback in the current desktop UI
- Packaging: Tauri DMG for macOS and NSIS/MSI targets for Windows
- USB helper: `npm run usb:prepare`

## Prerequisites

### macOS

- macOS development machine
- Node.js 20 or later
- npm
- Rust and Cargo
- Xcode Command Line Tools

### Windows

- Windows development machine
- Node.js 20 or later
- npm
- Rust and Cargo
- Visual Studio 2022 Build Tools
- Desktop development with C++ workload
- MSVC v143 toolset
- Windows 10/11 SDK
- NSIS if an NSIS target is required locally

## Reproducible build

From the repository root:

```bash
npm ci
npm run typecheck
npm run tauri:build
npm run usb:prepare
```

Use PowerShell syntax on Windows if needed; the commands are otherwise the same.

## Outputs

- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows NSIS: `src-tauri/target/release/bundle/nsis/`
- Windows MSI: `src-tauri/target/release/bundle/msi/`
- USB staging folder: `usb-package/`

## USB distribution

Use exFAT for a USB drive shared between macOS and Windows. Place artifacts in:

```text
Happy-Mixer-DJ-USB/
├── macOS/
├── Windows/
├── START-HERE.txt
└── README.txt
```

The USB package contains installers, not a universal portable executable. The Mac and Windows artifacts must be built on their respective operating systems.

## Release quality

Run `npm run typecheck` before every build. Test loading, playback, seek, cue, pitch, deck volume, master volume, and crossfader on each target OS. For public distribution, configure Apple signing/notarization and Windows Authenticode signing. Never commit signing certificates or private keys.

## Offline expectations

The app itself can run without internet after installation. Dependency installation and first-time compilation normally require internet access unless the npm and Cargo caches are already available locally. Local audio files are not bundled into the installer.
