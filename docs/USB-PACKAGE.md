# Happy Mixer DJ — Transfer Package

This project now includes an export command that combines the source code, configuration, documentation, and build scripts into one folder suitable for copying to a USB drive or another computer.

## Create the transfer package

From the repository root:

```bash
npm run export:usb
```

The generated folder is:

```text
Happy-Mixer-DJ-USB-Package/
```

Copy that entire folder to the USB drive. Do not copy only individual source files.

## Build on the destination computer

### macOS

Open Terminal inside the transferred folder and run:

```bash
bash scripts/build-macos.sh
```

Or run manually:

```bash
npm install
npm run typecheck
npm run tauri:build
npm run usb:prepare
```

### Windows

Open PowerShell inside the transferred folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\build-windows.ps1
```

Or run manually:

```powershell
npm install
npm run typecheck
npm run tauri:build
npm run usb:prepare
```

## Important

The transfer folder is a source/build package. It is not a single portable executable because macOS and Windows require different native binaries. Build the macOS installer on macOS and the Windows installers on Windows.

The native artifacts are created under `src-tauri/target/release/bundle/`. The USB staging folder is `usb-package/`.
