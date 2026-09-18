import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'usb-package');
const bundle = join(root, 'src-tauri', 'target', 'release', 'bundle');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const candidates = [
  [join(bundle, 'dmg'), join(output, 'macOS-installer')],
  [join(bundle, 'nsis'), join(output, 'Windows-installer')],
  [join(bundle, 'msi'), join(output, 'Windows-installer')],
  [join(bundle, 'app'), join(output, 'macOS-app')],
];

let copied = 0;
for (const [source, destination] of candidates) {
  if (!existsSync(source)) continue;
  await cp(source, destination, { recursive: true });
  copied += 1;
}

await writeFile(join(output, 'START-HERE.txt'), `Happy Mixer DJ USB package\n\nThis folder contains platform-specific installers.\n\nmacOS: open macOS-installer and run the DMG, or copy the app to Applications.\nWindows: open Windows-installer and run the EXE/MSI installer.\n\nDo not run a macOS app on Windows or a Windows installer on macOS.\nMusic files are not included; load local audio from the computer after installation.\n\nPrepared package folders: ${copied}\n`);
console.log(`USB package prepared at ${output}`);
