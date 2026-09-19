#!/usr/bin/env bash
set -euo pipefail
npm install
npm run typecheck
npm run tauri:build
npm run usb:prepare
