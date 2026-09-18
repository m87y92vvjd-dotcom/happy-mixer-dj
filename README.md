# Happy Mixer DJ

Offline four-deck desktop DJ software for macOS and Windows.

## Current app

- Four local audio decks
- Play, pause, seek, pitch, volume, cue, master volume, and crossfader controls
- Offline operation with no web service required
- Native Tauri packaging
- USB package preparation for platform installers

## Development

```bash
npm ci
npm run typecheck
npm run tauri:dev
```

## Production installers

Build on each target operating system:

```bash
npm run tauri:build
npm run usb:prepare
```

See `docs/USB-PACKAGE.md` for copying the resulting `usb-package` folder to a USB drive.
