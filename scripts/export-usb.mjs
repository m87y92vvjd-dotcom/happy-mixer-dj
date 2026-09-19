import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const output = join(root, 'Happy-Mixer-DJ-USB-Package');
const excluded = new Set(['.git', 'node_modules', 'dist', 'usb-package', 'Happy-Mixer-DJ-USB-Package', 'src-tauri/target']);

function isExcluded(path) {
  const normalized = relative(root, path).replaceAll('\\', '/');
  return [...excluded].some((entry) => normalized === entry || normalized.startsWith(`${entry}/`));
}

async function copyTree(source, destination) {
  if (!existsSync(source) || isExcluded(source)) return;
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (isExcluded(from)) continue;
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await cp(from, to);
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copyTree(root, output);

await writeFile(join(output, 'START-HERE.txt'), `Happy Mixer DJ - Transfer Package\n\nThis package contains the complete source project and build instructions.\n\n1. Copy this entire folder to the destination computer.\n2. Open docs/USB-PACKAGE.md.\n3. Install the required tools for that computer.\n4. Run the platform build commands.\n5. Copy the generated installer to the USB when finished.\n\nThis is a source/build package, not a compiled universal executable. macOS and Windows installers must be built on their matching operating systems.\n`);

await writeFile(join(output, 'PACKAGE-MANIFEST.txt'), `Happy Mixer DJ transfer package\nCreated: ${new Date().toISOString()}\nSource: ${root}\nExcluded: node_modules, build output, Git metadata, and native target files\n`);

console.log(`Created transfer package: ${output}`);
