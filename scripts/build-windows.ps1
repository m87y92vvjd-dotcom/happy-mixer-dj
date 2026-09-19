$ErrorActionPreference = 'Stop'
npm install
npm run typecheck
npm run tauri:build
npm run usb:prepare
