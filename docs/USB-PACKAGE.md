# Happy Mixer DJ — USB copy guide

The repository cannot directly produce compiled `.dmg` or `.exe` files without running the platform build tools. This project now includes a repeatable USB packaging command.

## Build on macOS

```bash
npm ci
npm run typecheck
npm run tauri:build
npm run usb:prepare
```

Copy the generated `usb-package` folder to your USB drive. It contains the macOS DMG or app bundle when available.

## Build on Windows

```powershell
npm ci
npm run typecheck
npm run tauri:build
npm run usb:prepare
```

Copy the generated `usb-package` folder to your USB drive. It contains the Windows NSIS/MSI installer when available.

## Important

- macOS and Windows installers are different; build each on its target platform.
- The USB package is not a single universal executable.
- Use a USB drive formatted as exFAT when it must be shared between macOS and Windows.
- Keep at least 2 GB free for build artifacts and installers.
- Audio files are intentionally not copied into the package. Load them locally after installation.
- Unsigned installers may show an operating-system security warning. Signing requires your Apple and Microsoft certificates.
